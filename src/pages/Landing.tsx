import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Brain, BookOpen, Sparkles, Code, Network, ArrowRight, Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/contexts/ThemeContext';
const features = [{
  icon: BookOpen,
  title: 'Rich Knowledge Canvas',
  description: 'Write notes with Markdown, LaTeX equations, and code blocks. Everything you need for serious learning.'
}, {
  icon: Sparkles,
  title: 'AI Learning Assistant',
  description: 'Get summaries, explanations, quizzes, and code help powered by intelligent heuristics.'
}, {
  icon: Code,
  title: 'Code Execution',
  description: 'Run Python code directly in your notes. See results instantly in the output dock.'
}, {
  icon: Network,
  title: 'Concept Mapping',
  description: 'Visualize knowledge as interconnected concepts. See how ideas relate to each other.'
}];
export default function Landing() {
  const {
    theme,
    toggleTheme
  } = useTheme();
  return <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 glass-panel border-b">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <Brain className="w-8 h-8 text-pink-400" />
            <span className="text-xl font-serif font-bold text-foreground">AppliedMind</span>
          </Link>
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label="Toggle theme">
              {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>
            <Link to="/login">
              <Button variant="ghost">Sign In</Button>
            </Link>
            <Link to="/signup">
              <Button variant="hero">Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6">
        <div className="container mx-auto max-w-5xl text-center">
          <motion.div initial={{
          opacity: 0,
          y: 20
        }} animate={{
          opacity: 1,
          y: 0
        }} transition={{
          duration: 0.6
        }}>
            <h1 className="text-5xl md:text-7xl font-serif font-bold mb-6 leading-tight">
              Learn Deeply with{' '}
              <span className="gradient-text">AI-Powered</span>{' '}
              Intelligence
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground mb-10 max-w-3xl mx-auto leading-relaxed">
              A modern notes and learning system for researchers, students, and lifelong learners. 
              Combine rich-text notes, code execution, and intelligent study tools in one beautiful workspace.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/signup">
                <Button variant="hero" size="xl" className="group">
                  Start Learning Free
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <Link to="/login">
                <Button variant="outline" size="xl">
                  Sign In
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 px-6 bg-canvas">
        <div className="container mx-auto max-w-6xl">
          <motion.div initial={{
          opacity: 0
        }} whileInView={{
          opacity: 1
        }} viewport={{
          once: true
        }} transition={{
          duration: 0.6
        }} className="text-center mb-16">
            <h2 className="text-4xl font-serif font-bold mb-4">
              Everything You Need to Master Any Subject
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              AppliedMind combines the best features of note-taking, coding environments, 
              and spaced repetition into one seamless experience.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-8">
            {features.map((feature, index) => <motion.div key={feature.title} initial={{
            opacity: 0,
            y: 20
          }} whileInView={{
            opacity: 1,
            y: 0
          }} viewport={{
            once: true
          }} transition={{
            duration: 0.5,
            delay: index * 0.1
          }} className="glass-card p-8 hover:shadow-glow transition-all duration-300">
                <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-accent" />
                </div>
                <h3 className="text-xl font-serif font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </motion.div>)}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-6">
        <div className="container mx-auto max-w-4xl text-center">
          <motion.div initial={{
          opacity: 0,
          scale: 0.95
        }} whileInView={{
          opacity: 1,
          scale: 1
        }} viewport={{
          once: true
        }} transition={{
          duration: 0.5
        }} className="glass-card p-12 glow-accent">
            <h2 className="text-3xl md:text-4xl font-serif font-bold mb-4">
              Ready to Transform Your Learning?
            </h2>
            <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
              Join thousands of learners using AppliedMind to take better notes, 
              understand complex concepts, and retain knowledge longer.
            </p>
            <Link to="/signup">
              <Button variant="hero" size="xl">
                Get Started — It's Free
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 border-t border-border">
        <div className="container mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Brain className="w-6 h-6 text-accent" />
            <span className="font-serif font-semibold">AppliedMind</span>
          </div>
          <p className="text-sm text-muted-foreground">
            © 2024 AppliedMind. Built for curious minds.
          </p>
        </div>
      </footer>
    </div>;
}