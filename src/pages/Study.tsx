import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, ArrowLeft, Check, X, RotateCcw, GraduationCap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Flashcard {
  id: string;
  front: string;
  back: string;
  ease: number;
  interval_days: number;
  due_date: string;
}

export default function Study() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [completed, setCompleted] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchDueFlashcards();
    }
  }, [user]);

  const fetchDueFlashcards = async () => {
    setLoading(true);
    const today = new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('flashcards')
      .select('*')
      .lte('due_date', today)
      .order('due_date', { ascending: true });

    if (error) {
      toast({
        title: 'Error loading flashcards',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      setFlashcards(data || []);
    }
    setLoading(false);
  };

  const currentCard = flashcards[currentIndex];
  const progress = flashcards.length > 0 ? (completed.length / flashcards.length) * 100 : 0;

  const handleAnswer = async (correct: boolean) => {
    if (!currentCard) return;

    // Update flashcard using spaced repetition algorithm
    let newEase = currentCard.ease;
    let newInterval = currentCard.interval_days;

    if (correct) {
      newEase = Math.min(3.0, currentCard.ease + 0.1);
      newInterval = Math.round(currentCard.interval_days * newEase);
    } else {
      newEase = Math.max(1.3, currentCard.ease - 0.2);
      newInterval = 1;
    }

    const newDueDate = new Date();
    newDueDate.setDate(newDueDate.getDate() + newInterval);

    await supabase
      .from('flashcards')
      .update({
        ease: newEase,
        interval_days: newInterval,
        due_date: newDueDate.toISOString().split('T')[0],
      })
      .eq('id', currentCard.id);

    setCompleted((prev) => [...prev, currentCard.id]);
    setFlipped(false);

    if (currentIndex < flashcards.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const restart = () => {
    setCurrentIndex(0);
    setCompleted([]);
    setFlipped(false);
    fetchDueFlashcards();
  };

  const allCompleted = completed.length === flashcards.length && flashcards.length > 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 glass-panel border-b">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/app')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-2">
              <GraduationCap className="w-8 h-8 text-accent" />
              <span className="text-xl font-serif font-bold">Study Session</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              {completed.length} / {flashcards.length} cards
            </span>
            <Button variant="outline" size="sm" onClick={restart}>
              <RotateCcw className="w-4 h-4 mr-2" />
              Restart
            </Button>
          </div>
        </div>
      </header>

      {/* Progress Bar */}
      <div className="fixed top-16 left-0 right-0 z-40 px-6 py-3 bg-canvas border-b border-border">
        <Progress value={progress} className="h-2" />
      </div>

      {/* Main Content */}
      <main className="pt-32 pb-8 px-6">
        <div className="container mx-auto max-w-2xl">
          {flashcards.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-16"
            >
              <GraduationCap className="w-16 h-16 text-accent mx-auto mb-6" />
              <h2 className="text-2xl font-serif font-bold mb-2">All caught up!</h2>
              <p className="text-muted-foreground mb-6">
                No flashcards due for review today. Great job!
              </p>
              <Button variant="outline" onClick={() => navigate('/app')}>
                Back to Notes
              </Button>
            </motion.div>
          ) : allCompleted ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-16"
            >
              <div className="w-20 h-20 rounded-full bg-success/20 flex items-center justify-center mx-auto mb-6">
                <Check className="w-10 h-10 text-success" />
              </div>
              <h2 className="text-2xl font-serif font-bold mb-2">Session Complete!</h2>
              <p className="text-muted-foreground mb-6">
                You've reviewed all {flashcards.length} cards due today.
              </p>
              <div className="flex gap-4 justify-center">
                <Button variant="outline" onClick={() => navigate('/app')}>
                  Back to Notes
                </Button>
                <Button variant="hero" onClick={restart}>
                  Study Again
                </Button>
              </div>
            </motion.div>
          ) : currentCard ? (
            <AnimatePresence mode="wait">
              <motion.div
                key={currentCard.id}
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                className="space-y-6"
              >
                {/* Flashcard */}
                <Card
                  className={`min-h-[300px] cursor-pointer transition-all duration-300 ${
                    flipped ? 'bg-accent/10' : 'bg-card'
                  }`}
                  onClick={() => setFlipped(!flipped)}
                >
                  <div className="p-8 flex flex-col items-center justify-center min-h-[300px]">
                    <span className="text-xs uppercase tracking-wider text-muted-foreground mb-4">
                      {flipped ? 'Answer' : 'Question'}
                    </span>
                    <p className="text-xl text-center font-medium whitespace-pre-wrap">
                      {flipped ? currentCard.back : currentCard.front}
                    </p>
                    {!flipped && (
                      <p className="text-sm text-muted-foreground mt-4">
                        Click to reveal answer
                      </p>
                    )}
                  </div>
                </Card>

                {/* Answer Buttons */}
                {flipped && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex gap-4 justify-center"
                  >
                    <Button
                      variant="outline"
                      size="lg"
                      onClick={() => handleAnswer(false)}
                      className="flex-1 max-w-[200px] border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                    >
                      <X className="w-5 h-5 mr-2" />
                      Incorrect
                    </Button>
                    <Button
                      variant="hero"
                      size="lg"
                      onClick={() => handleAnswer(true)}
                      className="flex-1 max-w-[200px]"
                    >
                      <Check className="w-5 h-5 mr-2" />
                      Correct
                    </Button>
                  </motion.div>
                )}
              </motion.div>
            </AnimatePresence>
          ) : null}
        </div>
      </main>
    </div>
  );
}
