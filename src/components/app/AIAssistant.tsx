import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Sparkles,
  FileText,
  HelpCircle,
  Code,
  Network,
  Lightbulb,
  Loader2,
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

interface AIAssistantProps {
  noteContent: string;
}

type AIMode = 'summarize' | 'explain' | 'quiz' | 'code' | 'concepts';

interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
}

export default function AIAssistant({ noteContent }: AIAssistantProps) {
  const [activeMode, setActiveMode] = useState<AIMode>('summarize');
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [explanations, setExplanations] = useState<{ term: string; explanation: string }[]>([]);
  const [quiz, setQuiz] = useState<QuizQuestion[]>([]);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [codeHints, setCodeHints] = useState<string[]>([]);
  const [concepts, setConcepts] = useState<{ id: string; name: string }[]>([]);

  const modes = [
    { id: 'summarize' as const, icon: FileText, label: 'Summarize' },
    { id: 'explain' as const, icon: HelpCircle, label: 'Explain' },
    { id: 'quiz' as const, icon: Lightbulb, label: 'Quiz' },
    { id: 'code' as const, icon: Code, label: 'Code Help' },
    { id: 'concepts' as const, icon: Network, label: 'Concepts' },
  ];

  // Heuristic-based AI simulation
  const generateSummary = () => {
    setLoading(true);
    setTimeout(() => {
      const lines = noteContent.split('\n').filter(l => l.trim());
      const headings = lines.filter(l => l.startsWith('#'));
      const bullets = lines.filter(l => l.match(/^[-*]\s/));
      
      let summaryText = '## Summary\n\n';
      
      if (headings.length > 0) {
        summaryText += '**Key Topics:**\n';
        headings.slice(0, 5).forEach(h => {
          summaryText += `- ${h.replace(/^#+\s*/, '')}\n`;
        });
        summaryText += '\n';
      }
      
      if (bullets.length > 0) {
        summaryText += '**Key Points:**\n';
        bullets.slice(0, 5).forEach(b => {
          summaryText += `${b}\n`;
        });
      }

      // Extract key equations
      const equations = noteContent.match(/\$\$[\s\S]*?\$\$/g);
      if (equations && equations.length > 0) {
        summaryText += '\n**Key Equations:**\n';
        equations.slice(0, 3).forEach(eq => {
          summaryText += `${eq}\n\n`;
        });
      }

      setSummary(summaryText || 'No content to summarize yet. Add some notes!');
      setLoading(false);
    }, 500);
  };

  const generateExplanations = () => {
    setLoading(true);
    setTimeout(() => {
      const terms: { term: string; explanation: string }[] = [];
      
      // Extract terms from headings
      const headings = noteContent.match(/^#+\s+(.+)$/gm);
      headings?.slice(0, 5).forEach(h => {
        const term = h.replace(/^#+\s*/, '');
        terms.push({
          term,
          explanation: `${term} is a key concept covered in this note. Review the section for detailed information.`,
        });
      });

      // Extract LaTeX variables
      const latexVars = noteContent.match(/\$([A-Z]_?\{?[a-z]*\}?)\$/g);
      const uniqueVars = [...new Set(latexVars)];
      uniqueVars?.slice(0, 5).forEach(v => {
        const clean = v.replace(/\$/g, '');
        terms.push({
          term: clean,
          explanation: `Variable ${clean} appears in equations throughout this note.`,
        });
      });

      setExplanations(terms.length > 0 ? terms : [{ term: 'No terms found', explanation: 'Add some content with headings or equations.' }]);
      setLoading(false);
    }, 500);
  };

  const generateQuiz = () => {
    setLoading(true);
    setTimeout(() => {
      const questions: QuizQuestion[] = [];
      const headings = noteContent.match(/^#+\s+(.+)$/gm) || [];
      
      headings.slice(0, 5).forEach((heading, i) => {
        const topic = heading.replace(/^#+\s*/, '');
        questions.push({
          question: `What is the main concept of "${topic}"?`,
          options: [
            `A fundamental principle in this topic`,
            `An unrelated concept`,
            `A specific implementation detail`,
            `None of the above`,
          ],
          correctIndex: 0,
        });
      });

      // Add equation-based questions
      const equations = noteContent.match(/\$\$([^$]+)\$\$/g);
      if (equations && equations.length > 0) {
        questions.push({
          question: 'Which equation is mentioned in the notes?',
          options: [
            equations[0].replace(/\$\$/g, '').trim().slice(0, 30) + '...',
            'F = ma',
            'E = hν',
            'PV = nRT',
          ],
          correctIndex: 0,
        });
      }

      setQuiz(questions.length > 0 ? questions : [{
        question: 'Add more content to generate quiz questions!',
        options: ['OK', 'Sure', 'Will do', 'Understood'],
        correctIndex: 0,
      }]);
      setSelectedAnswers({});
      setLoading(false);
    }, 500);
  };

  const generateCodeHints = () => {
    setLoading(true);
    setTimeout(() => {
      const hints: string[] = [];
      const codeBlocks = noteContent.match(/```python\n([\s\S]*?)```/g);

      if (codeBlocks) {
        codeBlocks.forEach(block => {
          const code = block.replace(/```python\n|```/g, '');
          
          if (!code.includes('def ') && code.length > 100) {
            hints.push('💡 Consider wrapping this code in a function for reusability.');
          }
          if (code.includes('print(') && code.includes('f"')) {
            hints.push('✓ Good use of f-strings for formatted output!');
          }
          if (!code.includes('#')) {
            hints.push('📝 Add comments to explain complex logic.');
          }
          if (code.includes('import math')) {
            hints.push('✓ Using the math module for mathematical operations.');
          }
        });
      }

      setCodeHints(hints.length > 0 ? hints : ['No Python code blocks found in this note.']);
      setLoading(false);
    }, 500);
  };

  const extractConcepts = () => {
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
    }, 500);
  };

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

      {/* Mode Tabs */}
      <Tabs value={activeMode} onValueChange={(v) => handleModeChange(v as AIMode)} className="flex-1 flex flex-col">
        <TabsList className="grid grid-cols-5 mx-4 mt-4 bg-muted">
          {modes.map((mode) => (
            <TabsTrigger
              key={mode.id}
              value={mode.id}
              className="text-xs p-2"
              title={mode.label}
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
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-accent" />
              </div>
            ) : summary ? (
              <div className="prose prose-sm dark:prose-invert">
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
          </TabsContent>

          {/* Quiz */}
          <TabsContent value="quiz" className="p-4 m-0">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium">Quiz</h3>
              <Button variant="outline" size="sm" onClick={generateQuiz} disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'New Quiz'}
              </Button>
            </div>
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
          </TabsContent>

          {/* Code Help */}
          <TabsContent value="code" className="p-4 m-0">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium">Code Analysis</h3>
              <Button variant="outline" size="sm" onClick={generateCodeHints} disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Analyze'}
              </Button>
            </div>
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
