import { useState, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Sparkles,
  FileText,
  HelpCircle,
  Code,
  Network,
  Lightbulb,
  Loader2,
  Clock,
  AlertCircle,
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Progress } from '@/components/ui/progress';

interface AIAssistantProps {
  noteContent: string;
}

type AIMode = 'summarize' | 'explain' | 'quiz' | 'code' | 'concepts';

interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
}

interface Explanation {
  term: string;
  explanation: string;
}

interface RateLimitInfo {
  remaining: number;
  limit: number;
  resetAt: number | null;
  isLimited: boolean;
}

const AI_FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-assistant`;
const DEFAULT_RATE_LIMIT = 10;

// Helper to get the current session token
async function getAuthToken(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}

export default function AIAssistant({ noteContent }: AIAssistantProps) {
  const [activeMode, setActiveMode] = useState<AIMode>('summarize');
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [explanations, setExplanations] = useState<Explanation[]>([]);
  const [quiz, setQuiz] = useState<QuizQuestion[]>([]);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [codeHints, setCodeHints] = useState<string[]>([]);
  const [concepts, setConcepts] = useState<{ id: string; name: string }[]>([]);
  const [rateLimit, setRateLimit] = useState<RateLimitInfo>({
    remaining: DEFAULT_RATE_LIMIT,
    limit: DEFAULT_RATE_LIMIT,
    resetAt: null,
    isLimited: false,
  });
  const [countdown, setCountdown] = useState<number>(0);
  const { toast } = useToast();

  const modes = [
    { id: 'summarize' as const, icon: FileText, label: 'Summarize' },
    { id: 'explain' as const, icon: HelpCircle, label: 'Explain' },
    { id: 'quiz' as const, icon: Lightbulb, label: 'Quiz' },
    { id: 'code' as const, icon: Code, label: 'Code Help' },
    { id: 'concepts' as const, icon: Network, label: 'Concepts' },
  ];

  // Countdown timer for rate limit
  useEffect(() => {
    if (!rateLimit.isLimited || !rateLimit.resetAt) return;

    const updateCountdown = () => {
      const now = Date.now();
      const remaining = Math.max(0, Math.ceil((rateLimit.resetAt! - now) / 1000));
      setCountdown(remaining);

      if (remaining <= 0) {
        setRateLimit(prev => ({
          ...prev,
          isLimited: false,
          remaining: prev.limit,
        }));
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [rateLimit.isLimited, rateLimit.resetAt]);

  // Helper to update rate limit from response headers
  const updateRateLimitFromResponse = useCallback((response: Response) => {
    const remaining = response.headers.get('X-RateLimit-Remaining');
    const resetAt = response.headers.get('X-RateLimit-Reset');
    const limit = response.headers.get('X-RateLimit-Limit');

    if (remaining !== null) {
      setRateLimit(prev => ({
        remaining: parseInt(remaining, 10),
        limit: limit ? parseInt(limit, 10) : prev.limit,
        resetAt: resetAt ? parseInt(resetAt, 10) : prev.resetAt,
        isLimited: parseInt(remaining, 10) === 0,
      }));
    }
  }, []);

  // Handle rate limit error from response
  const handleRateLimitError = useCallback(async (response: Response) => {
    const data = await response.json();
    const retryAfter = data.retryAfter || parseInt(response.headers.get('Retry-After') || '60', 10);
    const resetAt = data.resetAt || Date.now() + retryAfter * 1000;

    setRateLimit({
      remaining: 0,
      limit: rateLimit.limit,
      resetAt,
      isLimited: true,
    });
    setCountdown(retryAfter);

    toast({
      variant: "destructive",
      title: "Rate Limit Reached",
      description: `Please wait ${retryAfter} seconds before making another request.`,
    });
  }, [rateLimit.limit, toast]);

  const handleAIError = useCallback((error: string) => {
    toast({
      variant: "destructive",
      title: "AI Error",
      description: error,
    });
  }, [toast]);

  // Streaming summary generation
  const generateSummary = useCallback(async () => {
    if (rateLimit.isLimited) {
      toast({
        variant: "destructive",
        title: "Rate Limit Active",
        description: `Please wait ${countdown} seconds before making another request.`,
      });
      return;
    }

    if (!noteContent.trim()) {
      setSummary('No content to summarize yet. Add some notes!');
      return;
    }

    setLoading(true);
    setSummary('');

    try {
      const token = await getAuthToken();
      if (!token) {
        throw new Error('Please sign in to use the AI assistant');
      }

      const response = await fetch(AI_FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ mode: 'summarize', noteContent }),
      });

      if (response.status === 429) {
        await handleRateLimitError(response);
        return;
      }

      updateRateLimitFromResponse(response);

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to generate summary');
      }

      if (!response.body) throw new Error('No response body');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = '';
      let fullSummary = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') break;

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              fullSummary += content;
              setSummary(fullSummary);
            }
          } catch {
            textBuffer = line + '\n' + textBuffer;
            break;
          }
        }
      }
    } catch (error) {
      handleAIError(error instanceof Error ? error.message : 'Failed to generate summary');
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }, [noteContent, handleAIError, rateLimit.isLimited, countdown, toast, handleRateLimitError, updateRateLimitFromResponse]);

  // Non-streaming API call for structured responses
  const callAI = useCallback(async (mode: 'explain' | 'quiz' | 'code'): Promise<string | null> => {
    if (rateLimit.isLimited) {
      toast({
        variant: "destructive",
        title: "Rate Limit Active",
        description: `Please wait ${countdown} seconds before making another request.`,
      });
      return null;
    }

    if (!noteContent.trim()) {
      return null;
    }

    const token = await getAuthToken();
    if (!token) {
      throw new Error('Please sign in to use the AI assistant');
    }

    const response = await fetch(AI_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ mode, noteContent }),
    });

    if (response.status === 429) {
      await handleRateLimitError(response);
      return null;
    }

    updateRateLimitFromResponse(response);

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || `Failed to get ${mode} response`);
    }

    const data = await response.json();
    return data.content;
  }, [noteContent, rateLimit.isLimited, countdown, toast, handleRateLimitError, updateRateLimitFromResponse]);

  const generateExplanations = useCallback(async () => {
    if (!noteContent.trim()) {
      setExplanations([{ term: 'No content', explanation: 'Add some notes to get explanations.' }]);
      return;
    }

    setLoading(true);
    try {
      const content = await callAI('explain');
      if (content) {
        // Extract JSON from the response (in case there's extra text)
        const jsonMatch = content.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]) as Explanation[];
          setExplanations(parsed);
        } else {
          throw new Error('Invalid response format');
        }
      }
    } catch (error) {
      handleAIError(error instanceof Error ? error.message : 'Failed to generate explanations');
      setExplanations([{ term: 'Error', explanation: 'Failed to analyze content. Please try again.' }]);
    } finally {
      setLoading(false);
    }
  }, [noteContent, callAI, handleAIError]);

  const generateQuiz = useCallback(async () => {
    if (!noteContent.trim()) {
      setQuiz([{
        question: 'Add more content to generate quiz questions!',
        options: ['OK', 'Sure', 'Will do', 'Understood'],
        correctIndex: 0,
      }]);
      return;
    }

    setLoading(true);
    try {
      const content = await callAI('quiz');
      if (content) {
        const jsonMatch = content.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]) as QuizQuestion[];
          setQuiz(parsed);
          setSelectedAnswers({});
        } else {
          throw new Error('Invalid response format');
        }
      }
    } catch (error) {
      handleAIError(error instanceof Error ? error.message : 'Failed to generate quiz');
      setQuiz([{
        question: 'Failed to generate quiz. Please try again.',
        options: ['OK'],
        correctIndex: 0,
      }]);
    } finally {
      setLoading(false);
    }
  }, [noteContent, callAI, handleAIError]);

  const generateCodeHints = useCallback(async () => {
    if (!noteContent.trim() || !noteContent.includes('```')) {
      setCodeHints(['No code blocks found in this note.']);
      return;
    }

    setLoading(true);
    try {
      const content = await callAI('code');
      if (content) {
        const jsonMatch = content.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]) as string[];
          setCodeHints(parsed);
        } else {
          throw new Error('Invalid response format');
        }
      }
    } catch (error) {
      handleAIError(error instanceof Error ? error.message : 'Failed to analyze code');
      setCodeHints(['Failed to analyze code. Please try again.']);
    } finally {
      setLoading(false);
    }
  }, [noteContent, callAI, handleAIError]);

  // Local concept extraction (kept as heuristic since it's for graph visualization)
  const extractConcepts = useCallback(() => {
    setLoading(true);
    setTimeout(() => {
      const extracted: { id: string; name: string }[] = [];
      const seen = new Set<string>();

      // Extract from headings
      const headings = noteContent.match(/^#+\s+(.+)$/gm);
      headings?.forEach(h => {
        const name = h.replace(/^#+\s*/, '').trim();
        if (!seen.has(name.toLowerCase()) && name.length > 2) {
          seen.add(name.toLowerCase());
          extracted.push({ id: crypto.randomUUID(), name });
        }
      });

      // Extract capitalized terms
      const caps = noteContent.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g);
      caps?.forEach(term => {
        if (!seen.has(term.toLowerCase()) && term.length > 3) {
          seen.add(term.toLowerCase());
          extracted.push({ id: crypto.randomUUID(), name: term });
        }
      });

      setConcepts(extracted.slice(0, 10));
      setLoading(false);
    }, 300);
  }, [noteContent]);

  const handleModeChange = (mode: AIMode) => {
    setActiveMode(mode);
    switch (mode) {
      case 'summarize':
        if (!summary) generateSummary();
        break;
      case 'explain':
        if (explanations.length === 0) generateExplanations();
        break;
      case 'quiz':
        if (quiz.length === 0) generateQuiz();
        break;
      case 'code':
        if (codeHints.length === 0) generateCodeHints();
        break;
      case 'concepts':
        if (concepts.length === 0) extractConcepts();
        break;
    }
  };

  const selectAnswer = (questionIndex: number, optionIndex: number) => {
    setSelectedAnswers(prev => ({ ...prev, [questionIndex]: optionIndex }));
  };

  return (
    <div className="w-96 h-full bg-panel border-l border-border flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-2 p-4 border-b border-border">
        <Sparkles className="w-5 h-5 text-accent" />
        <h2 className="font-serif font-semibold">AI Assistant</h2>
      </div>

      {/* Rate Limit Indicator */}
      <div className="px-4 py-2 border-b border-border">
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
          <span className="flex items-center gap-1">
            {rateLimit.isLimited ? (
              <>
                <AlertCircle className="w-3 h-3 text-destructive" />
                <span className="text-destructive">Rate limited</span>
              </>
            ) : (
              <>
                <Clock className="w-3 h-3" />
                <span>Requests remaining</span>
              </>
            )}
          </span>
          <span className={rateLimit.isLimited ? 'text-destructive font-medium' : ''}>
            {rateLimit.isLimited ? `${countdown}s` : `${rateLimit.remaining}/${rateLimit.limit}`}
          </span>
        </div>
        <Progress 
          value={rateLimit.isLimited ? (countdown / 60) * 100 : (rateLimit.remaining / rateLimit.limit) * 100} 
          className={`h-1.5 ${rateLimit.isLimited ? '[&>div]:bg-destructive' : ''}`}
        />
        {rateLimit.isLimited && (
          <motion.p 
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-xs text-destructive mt-2 text-center"
          >
            Wait {countdown}s before next request
          </motion.p>
        )}
      </div>

      {/* Mode Tabs */}
      <Tabs value={activeMode} onValueChange={(v) => handleModeChange(v as AIMode)} className="flex-1 flex flex-col">
        <TabsList className="grid grid-cols-5 mx-4 mt-4 bg-muted">
          {modes.map((mode) => (
            <TabsTrigger
              key={mode.id}
              value={mode.id}
              className="text-xs p-2"
              title={mode.label}
              disabled={rateLimit.isLimited && mode.id !== 'concepts'}
            >
              <mode.icon className="w-4 h-4" />
            </TabsTrigger>
          ))}
        </TabsList>

        <ScrollArea className="flex-1">
          {/* Summarize */}
          <TabsContent value="summarize" className="p-4 m-0">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium">Summary</h3>
              <Button variant="outline" size="sm" onClick={generateSummary} disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Regenerate'}
              </Button>
            </div>
            {loading && !summary ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-accent" />
              </div>
            ) : summary ? (
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <div className="text-sm text-foreground/80 whitespace-pre-wrap">{summary}</div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Click to generate a summary.</p>
            )}
          </TabsContent>

          {/* Explain */}
          <TabsContent value="explain" className="p-4 m-0">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium">Key Terms</h3>
              <Button variant="outline" size="sm" onClick={generateExplanations} disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Refresh'}
              </Button>
            </div>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-accent" />
              </div>
            ) : (
              <div className="space-y-4">
                {explanations.map((item, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="p-3 rounded-lg bg-muted/50"
                  >
                    <h4 className="font-medium text-sm mb-1">{item.term}</h4>
                    <p className="text-xs text-muted-foreground">{item.explanation}</p>
                  </motion.div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Quiz */}
          <TabsContent value="quiz" className="p-4 m-0">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium">Quiz</h3>
              <Button variant="outline" size="sm" onClick={generateQuiz} disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'New Quiz'}
              </Button>
            </div>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-accent" />
              </div>
            ) : (
              <div className="space-y-6">
                {quiz.map((q, qIndex) => (
                  <div key={qIndex} className="space-y-2">
                    <p className="text-sm font-medium">{qIndex + 1}. {q.question}</p>
                    <div className="space-y-1">
                      {q.options.map((opt, oIndex) => {
                        const isSelected = selectedAnswers[qIndex] === oIndex;
                        const isCorrect = q.correctIndex === oIndex;
                        const showResult = selectedAnswers[qIndex] !== undefined;
                        
                        return (
                          <button
                            key={oIndex}
                            onClick={() => selectAnswer(qIndex, oIndex)}
                            disabled={showResult}
                            className={`quiz-option w-full text-left text-sm ${
                              showResult
                                ? isCorrect
                                  ? 'correct'
                                  : isSelected
                                  ? 'incorrect'
                                  : ''
                                : isSelected
                                ? 'selected'
                                : ''
                            }`}
                          >
                            {opt}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Code Help */}
          <TabsContent value="code" className="p-4 m-0">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium">Code Analysis</h3>
              <Button variant="outline" size="sm" onClick={generateCodeHints} disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Analyze'}
              </Button>
            </div>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-accent" />
              </div>
            ) : (
              <div className="space-y-3">
                {codeHints.map((hint, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="p-3 rounded-lg bg-muted/50 text-sm"
                  >
                    {hint}
                  </motion.div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Concepts */}
          <TabsContent value="concepts" className="p-4 m-0">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium">Extracted Concepts</h3>
              <Button variant="outline" size="sm" onClick={extractConcepts} disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Extract'}
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {concepts.map((concept) => (
                <motion.span
                  key={concept.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="concept-node"
                >
                  {concept.name}
                </motion.span>
              ))}
              {concepts.length === 0 && !loading && (
                <p className="text-sm text-muted-foreground">
                  Click Extract to find concepts in your notes.
                </p>
              )}
            </div>
          </TabsContent>
        </ScrollArea>
      </Tabs>
    </div>
  );
}
