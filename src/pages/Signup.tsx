import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Brain, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export default function Signup() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const createDemoContent = async (userId: string) => {
    // Create demo notebook
    const { data: notebook, error: notebookError } = await supabase
      .from('notebooks')
      .insert({ user_id: userId, title: 'Thermodynamics' })
      .select()
      .single();

    if (notebookError || !notebook) return;

    // Create demo note with Carnot cycle content
    const demoContent = `# Carnot Cycle - Heat Engine Efficiency

## Introduction
The Carnot cycle represents the most efficient heat engine possible, operating between two thermal reservoirs.

## Key Equations

The efficiency of a Carnot engine is given by:

$$\\eta = 1 - \\frac{T_C}{T_H}$$

Where:
- $T_H$ = Temperature of hot reservoir (K)
- $T_C$ = Temperature of cold reservoir (K)

## The Four Stages

1. **Isothermal Expansion** - Heat absorbed from hot reservoir
2. **Adiabatic Expansion** - Temperature drops to $T_C$
3. **Isothermal Compression** - Heat rejected to cold reservoir  
4. **Adiabatic Compression** - Temperature rises back to $T_H$

## Work and Heat

The work done per cycle:
$$W = Q_H - Q_C$$

The heat ratio follows:
$$\\frac{Q_C}{Q_H} = \\frac{T_C}{T_H}$$

## Python Simulation

\`\`\`python
import math

def carnot_efficiency(T_hot, T_cold):
    """Calculate Carnot efficiency"""
    if T_hot <= T_cold:
        return 0
    return 1 - (T_cold / T_hot)

# Example: Steam turbine
T_hot = 773  # 500°C in Kelvin
T_cold = 298  # 25°C in Kelvin

efficiency = carnot_efficiency(T_hot, T_cold)
print(f"Carnot Efficiency: {efficiency:.1%}")
print(f"Hot reservoir: {T_hot}K ({T_hot-273}°C)")
print(f"Cold reservoir: {T_cold}K ({T_cold-273}°C)")
\`\`\`

## Key Takeaways

- No real engine can exceed Carnot efficiency
- Higher temperature difference = higher efficiency
- This is a fundamental limit from thermodynamics
`;

    const { data: note } = await supabase
      .from('notes')
      .insert({
        notebook_id: notebook.id,
        user_id: userId,
        title: 'Carnot Cycle - Heat Engine Efficiency',
        content_markdown: demoContent,
      })
      .select()
      .single();

    // Create demo concepts
    const concepts = [
      { name: 'Carnot Cycle', type: 'concept' as const, description: 'Theoretical thermodynamic cycle with maximum efficiency' },
      { name: 'Thermal Efficiency', type: 'formula' as const, description: 'η = 1 - T_C/T_H' },
      { name: 'Heat Engine', type: 'concept' as const, description: 'Device that converts heat to mechanical work' },
      { name: 'Isothermal Process', type: 'concept' as const, description: 'Process at constant temperature' },
      { name: 'Adiabatic Process', type: 'concept' as const, description: 'Process with no heat transfer' },
    ];

    const { data: insertedConcepts } = await supabase
      .from('concepts')
      .insert(concepts.map(c => ({ ...c, user_id: userId })))
      .select();

    if (insertedConcepts && insertedConcepts.length >= 2) {
      // Create concept edges
      await supabase.from('concept_edges').insert([
        { user_id: userId, from_concept_id: insertedConcepts[1].id, to_concept_id: insertedConcepts[0].id, relation: 'derived_from' as const },
        { user_id: userId, from_concept_id: insertedConcepts[0].id, to_concept_id: insertedConcepts[2].id, relation: 'applied_in' as const },
      ]);
    }

    // Create demo flashcards
    const flashcards = [
      { front: 'What is the Carnot efficiency formula?', back: 'η = 1 - T_C/T_H, where T_C and T_H are cold and hot reservoir temperatures in Kelvin' },
      { front: 'What are the four stages of the Carnot cycle?', back: '1. Isothermal expansion\n2. Adiabatic expansion\n3. Isothermal compression\n4. Adiabatic compression' },
      { front: 'Why can no real engine exceed Carnot efficiency?', back: 'It represents the theoretical maximum efficiency allowed by the second law of thermodynamics' },
    ];

    await supabase.from('flashcards').insert(
      flashcards.map(f => ({ ...f, user_id: userId }))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await signUp(email, password, name);

    if (error) {
      toast({
        title: 'Sign up failed',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      // Wait briefly for auth to propagate
      setTimeout(async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await createDemoContent(user.id);
        }
        toast({
          title: 'Welcome to AppliedMind!',
          description: 'Your account has been created with demo content.',
        });
        navigate('/app');
      }, 500);
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left Panel - Decorative */}
      <div className="hidden lg:flex flex-1 bg-sidebar items-center justify-center p-12">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
          className="text-center text-sidebar-foreground"
        >
          <Brain className="w-24 h-24 text-sidebar-primary mx-auto mb-8" />
          <h2 className="text-3xl font-serif font-bold mb-4">Start Your Journey</h2>
          <p className="text-lg opacity-80 max-w-md">
            Create an account and unlock the power of AI-assisted learning.
          </p>
        </motion.div>
      </div>

      {/* Right Panel - Form */}
      <div className="flex-1 flex flex-col justify-center px-8 md:px-16 lg:px-24">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-md w-full mx-auto"
        >
          <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8">
            <ArrowLeft className="w-4 h-4" />
            Back to home
          </Link>

          <div className="flex items-center gap-3 mb-8">
            <Brain className="w-10 h-10 text-accent" />
            <h1 className="text-3xl font-serif font-bold">Create Account</h1>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                type="text"
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Create a password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button type="submit" variant="hero" className="w-full" disabled={loading}>
              {loading ? 'Creating account...' : 'Create Account'}
            </Button>
          </form>

          <p className="text-center text-muted-foreground mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-accent hover:underline font-medium">
              Sign in
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
