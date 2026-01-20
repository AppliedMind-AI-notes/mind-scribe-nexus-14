import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type AIMode = "summarize" | "explain" | "quiz" | "code";

interface RequestBody {
  mode: AIMode;
  noteContent: string;
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
    const { mode, noteContent }: RequestBody = await req.json();

    if (!noteContent || noteContent.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "No note content provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = getSystemPrompt(mode);
    const userMessage = `Here are my notes:\n\n${noteContent}`;

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
      const text = await response.text();
      console.error("AI gateway error:", response.status, text);
      return new Response(
        JSON.stringify({ error: "AI gateway error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // For streaming mode (summarize), return the stream directly
    if (mode === "summarize") {
      return new Response(response.body, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
    }

    // For non-streaming modes, parse and return JSON
    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    return new Response(
      JSON.stringify({ content, mode }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("AI assistant error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
