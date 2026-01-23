import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type AIMode = "summarize" | "explain" | "quiz" | "code";

interface RequestBody {
  mode: AIMode;
  noteContent: string;
}

// Rate limiting configuration
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 10; // 10 requests per minute per user

// In-memory rate limit store (resets on cold start)
const rateLimitStore = new Map<string, { count: number; windowStart: number }>();

function checkRateLimit(userId: string): { 
  allowed: boolean; 
  remaining: number; 
  retryAfter?: number;
  resetAt?: number;
} {
  const now = Date.now();
  const userLimit = rateLimitStore.get(userId);

  if (!userLimit || now - userLimit.windowStart > RATE_LIMIT_WINDOW_MS) {
    // Start a new window
    rateLimitStore.set(userId, { count: 1, windowStart: now });
    return { 
      allowed: true, 
      remaining: MAX_REQUESTS_PER_WINDOW - 1,
      resetAt: now + RATE_LIMIT_WINDOW_MS
    };
  }

  if (userLimit.count >= MAX_REQUESTS_PER_WINDOW) {
    const retryAfter = Math.ceil((userLimit.windowStart + RATE_LIMIT_WINDOW_MS - now) / 1000);
    return { 
      allowed: false, 
      remaining: 0, 
      retryAfter,
      resetAt: userLimit.windowStart + RATE_LIMIT_WINDOW_MS
    };
  }

  // Increment count
  userLimit.count++;
  return { 
    allowed: true, 
    remaining: MAX_REQUESTS_PER_WINDOW - userLimit.count,
    resetAt: userLimit.windowStart + RATE_LIMIT_WINDOW_MS
  };
}

// Clean up old entries periodically (prevent memory leak)
function cleanupRateLimitStore() {
  const now = Date.now();
  for (const [userId, data] of rateLimitStore.entries()) {
    if (now - data.windowStart > RATE_LIMIT_WINDOW_MS * 2) {
      rateLimitStore.delete(userId);
    }
  }
}

function getSystemPrompt(mode: AIMode): string {
  switch (mode) {
    case "summarize":
      return `You are an expert academic assistant. Summarize the given notes clearly and concisely.
Structure your response as:
1. **Main Topics**: List the key topics covered
2. **Key Points**: Bullet points of the most important information
3. **Key Equations**: If any mathematical equations are present, list them with brief explanations
4. **Takeaways**: 2-3 sentence summary of the most important things to remember

Use markdown formatting. Be concise but comprehensive.`;

    case "explain":
      return `You are an expert academic tutor. Analyze the given notes and identify key terms, concepts, and variables that need explanation.

For each term/concept you identify, provide:
- **Term**: The concept name
- **Explanation**: A clear, concise explanation suitable for a student

Format your response as a JSON array:
[{"term": "Term Name", "explanation": "Clear explanation here"}, ...]

Focus on:
1. Technical terms and jargon
2. Mathematical variables and their meanings
3. Key concepts that might be unfamiliar
4. Important definitions

Identify 5-8 key terms. Return ONLY the JSON array, no other text.`;

    case "quiz":
      return `You are an expert educator creating a quiz to test understanding.
Based on the notes provided, generate 5 multiple-choice questions.

Format your response as a JSON array:
[{
  "question": "The question text?",
  "options": ["Option A", "Option B", "Option C", "Option D"],
  "correctIndex": 0
}, ...]

Guidelines:
- Questions should test understanding, not just memorization
- Include questions about concepts, equations, and applications
- Make incorrect options plausible but clearly wrong
- Vary difficulty levels

Return ONLY the JSON array, no other text.`;

    case "code":
      return `You are an expert code reviewer and programming tutor.
Analyze the code in the notes and provide helpful feedback.

Structure your response as a JSON array of hints/suggestions:
["💡 Hint 1", "✓ Positive observation", "⚠️ Warning or issue", "📝 Suggestion"]

Focus on:
1. Code quality and best practices
2. Potential bugs or issues
3. Performance considerations
4. Readability and documentation
5. Positive observations about good patterns used

Provide 4-6 actionable hints. Return ONLY the JSON array, no other text.`;

    default:
      return "You are a helpful assistant.";
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Missing authorization" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: authError } = await supabaseClient.auth.getClaims(token);
    if (authError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Rate limiting check
    const userId = claimsData.claims.sub as string;
    cleanupRateLimitStore();
    const rateCheck = checkRateLimit(userId);
    
    if (!rateCheck.allowed) {
      return new Response(
        JSON.stringify({ 
          error: "Rate limit exceeded. Please try again later.",
          retryAfter: rateCheck.retryAfter,
          remaining: 0,
          resetAt: rateCheck.resetAt
        }),
        { 
          status: 429, 
          headers: { 
            ...corsHeaders, 
            "Content-Type": "application/json",
            "Retry-After": String(rateCheck.retryAfter),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": String(rateCheck.resetAt)
          } 
        }
      );
    }

    // Add rate limit headers to all successful responses
    const rateLimitHeaders = {
      "X-RateLimit-Remaining": String(rateCheck.remaining),
      "X-RateLimit-Reset": String(rateCheck.resetAt),
      "X-RateLimit-Limit": String(MAX_REQUESTS_PER_WINDOW)
    };

    const { mode, noteContent }: RequestBody = await req.json();

    // Validate mode
    const validModes: AIMode[] = ["summarize", "explain", "quiz", "code"];
    if (!mode || !validModes.includes(mode)) {
      return new Response(
        JSON.stringify({ error: "Invalid mode specified" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate noteContent
    if (!noteContent || typeof noteContent !== "string" || noteContent.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "No note content provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate content length (max 50KB to prevent abuse)
    const MAX_CONTENT_LENGTH = 50000;
    if (noteContent.length > MAX_CONTENT_LENGTH) {
      return new Response(
        JSON.stringify({ error: `Content too large. Maximum ${MAX_CONTENT_LENGTH.toLocaleString()} characters allowed.` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Sanitize content - strip null bytes and control characters
    const sanitizedContent = noteContent.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY is not configured");
      return new Response(
        JSON.stringify({ error: "AI service temporarily unavailable" }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const systemPrompt = getSystemPrompt(mode);
    const userMessage = `Here are my notes:\n\n${sanitizedContent}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
        stream: mode === "summarize", // Only stream for summarize mode
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required. Please add credits to your workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      // Log details server-side only, return generic error to client
      const text = await response.text();
      console.error("AI gateway error:", response.status, text);
      return new Response(
        JSON.stringify({ error: "AI service temporarily unavailable" }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // For streaming mode (summarize), return the stream directly
    if (mode === "summarize") {
      return new Response(response.body, {
        headers: { ...corsHeaders, ...rateLimitHeaders, "Content-Type": "text/event-stream" },
      });
    }

    // For non-streaming modes, parse and return JSON
    const aiData = await response.json();
    const content = aiData.choices?.[0]?.message?.content || "";

    return new Response(
      JSON.stringify({ content, mode }),
      { headers: { ...corsHeaders, ...rateLimitHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    // Log detailed error server-side only
    console.error("AI assistant error:", error);
    // Return generic error to client to prevent information leakage
    return new Response(
      JSON.stringify({ error: "An unexpected error occurred. Please try again." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
