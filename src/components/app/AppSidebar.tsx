import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Brain,
  BookOpen,
  Network,
  GraduationCap,
  Settings,
  LogOut,
  Plus,
  ChevronDown,
  ChevronRight,
  FileText,
  Moon,
  Sun,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { cn } from '@/lib/utils';

interface Notebook {
  id: string;
  title: string;
  notes: { id: string; title: string }[];
}

interface AppSidebarProps {
  notebooks: Notebook[];
  selectedNoteId: string | null;
  onCreateNotebook: () => void;
  onCreateNote: (notebookId: string) => void;
  onSelectNote: (noteId: string) => void;
}

export default function AppSidebar({
  notebooks,
  selectedNoteId,
  onCreateNotebook,
  onCreateNote,
  onSelectNote,
}: AppSidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [expandedNotebooks, setExpandedNotebooks] = useState<Set<string>>(new Set(notebooks.map(n => n.id)));

  const toggleNotebook = (id: string) => {
    const newExpanded = new Set(expandedNotebooks);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedNotebooks(newExpanded);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const navItems = [
    { path: '/app', icon: BookOpen, label: 'Notes' },
    { path: '/app/concepts', icon: Network, label: 'Concept Map' },
    { path: '/app/study', icon: GraduationCap, label: 'Study' },
    { path: '/app/settings', icon: Settings, label: 'Settings' },
  ];

  return (
    <div className="w-64 h-screen bg-sidebar flex flex-col border-r border-sidebar-border">
      {/* Logo */}
      <div className="p-4 border-b border-sidebar-border">
        <Link to="/app" className="flex items-center gap-2">
          <Brain className="w-8 h-8 text-sidebar-primary" />
          <span className="text-lg font-serif font-bold text-sidebar-foreground">AppliedMind</span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="p-2">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
              location.pathname === item.path
                ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
            )}
          >
            <item.icon className="w-4 h-4" />
            {item.label}
          </Link>
        ))}
      </nav>

      {/* Notebooks List */}
      <div className="flex-1 overflow-y-auto p-2 scrollbar-thin">
        <div className="flex items-center justify-between px-3 py-2">
          <span className="text-xs font-medium text-sidebar-foreground/60 uppercase tracking-wider">
            Notebooks
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-sidebar-foreground/60 hover:text-sidebar-foreground"
            onClick={onCreateNotebook}
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>

        <div className="space-y-1">
          {notebooks.map((notebook) => (
            <div key={notebook.id}>
              <button
                onClick={() => toggleNotebook(notebook.id)}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
              >
                {expandedNotebooks.has(notebook.id) ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
                <BookOpen className="w-4 h-4" />
                <span className="truncate flex-1 text-left">{notebook.title}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 opacity-0 group-hover:opacity-100 text-sidebar-foreground/60"
                  onClick={(e) => {
                    e.stopPropagation();
                    onCreateNote(notebook.id);
                  }}
                >
                  <Plus className="w-3 h-3" />
                </Button>
              </button>

              {expandedNotebooks.has(notebook.id) && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="ml-4 space-y-0.5"
                >
                  {notebook.notes.map((note) => (
                    <button
                      key={note.id}
                      onClick={() => onSelectNote(note.id)}
                      className={cn(
                        'w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors',
                        selectedNoteId === note.id
                          ? 'bg-sidebar-primary/20 text-sidebar-primary'
                          : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground'
                      )}
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span className="truncate">{note.title}</span>
                    </button>
                  ))}
                  <button
                    onClick={() => onCreateNote(notebook.id)}
                    className="w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-sm text-sidebar-foreground/50 hover:text-sidebar-foreground/70 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>New note</span>
                  </button>
                </motion.div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="p-2 border-t border-sidebar-border space-y-1">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-accent"
          onClick={toggleTheme}
        >
          {theme === 'dark' ? (
            <Sun className="w-4 h-4 mr-2" />
          ) : (
            <Moon className="w-4 h-4 mr-2" />
          )}
          {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-sidebar-foreground/80 hover:text-destructive hover:bg-sidebar-accent"
          onClick={handleSignOut}
        >
          <LogOut className="w-4 h-4 mr-2" />
          Sign Out
        </Button>
      </div>
    </div>
  );
}
