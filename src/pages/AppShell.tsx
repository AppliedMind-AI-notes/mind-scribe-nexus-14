import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import AppSidebar from '@/components/app/AppSidebar';
import NoteEditor from '@/components/app/NoteEditor';
import AIAssistant from '@/components/app/AIAssistant';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface Note {
  id: string;
  title: string;
  content_markdown: string;
  notebook_id: string;
}

interface Notebook {
  id: string;
  title: string;
  notes: { id: string; title: string }[];
}

export default function AppShell() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [notebooks, setNotebooks] = useState<Notebook[]>([]);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchNotebooks();
    }
  }, [user]);

  const fetchNotebooks = async () => {
    setLoading(true);
    
    const { data: notebooksData, error: notebooksError } = await supabase
      .from('notebooks')
      .select('id, title')
      .order('created_at', { ascending: false });

    if (notebooksError) {
      toast({
        title: 'Error loading notebooks',
        description: notebooksError.message,
        variant: 'destructive',
      });
      setLoading(false);
      return;
    }

    const notebooksWithNotes: Notebook[] = [];

    for (const notebook of notebooksData || []) {
      const { data: notesData } = await supabase
        .from('notes')
        .select('id, title')
        .eq('notebook_id', notebook.id)
        .order('updated_at', { ascending: false });

      notebooksWithNotes.push({
        ...notebook,
        notes: notesData || [],
      });
    }

    setNotebooks(notebooksWithNotes);
    
    // Auto-select first note if available
    if (notebooksWithNotes.length > 0 && notebooksWithNotes[0].notes.length > 0) {
      await loadNote(notebooksWithNotes[0].notes[0].id);
    }

    setLoading(false);
  };

  const loadNote = async (noteId: string) => {
    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .eq('id', noteId)
      .single();

    if (error) {
      toast({
        title: 'Error loading note',
        description: error.message,
        variant: 'destructive',
      });
      return;
    }

    setSelectedNote(data);
  };

  const createNotebook = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('notebooks')
      .insert({ user_id: user.id, title: 'New Notebook' })
      .select()
      .single();

    if (error) {
      toast({
        title: 'Error creating notebook',
        description: error.message,
        variant: 'destructive',
      });
      return;
    }

    setNotebooks(prev => [{ ...data, notes: [] }, ...prev]);
    toast({ title: 'Notebook created' });
  };

  const createNote = async (notebookId: string) => {
    if (!user) return;

    const { data, error } = await supabase
      .from('notes')
      .insert({
        user_id: user.id,
        notebook_id: notebookId,
        title: 'New Note',
        content_markdown: '',
      })
      .select()
      .single();

    if (error) {
      toast({
        title: 'Error creating note',
        description: error.message,
        variant: 'destructive',
      });
      return;
    }

    setNotebooks(prev =>
      prev.map(nb =>
        nb.id === notebookId
          ? { ...nb, notes: [{ id: data.id, title: data.title }, ...nb.notes] }
          : nb
      )
    );
    setSelectedNote(data);
    toast({ title: 'Note created' });
  };

  const handleNoteUpdate = () => {
    fetchNotebooks();
  };

  const handleNoteDelete = (noteId: string) => {
    setNotebooks(prev =>
      prev.map(nb => ({
        ...nb,
        notes: nb.notes.filter(n => n.id !== noteId),
      }))
    );
    setSelectedNote(null);
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <AppSidebar
        notebooks={notebooks}
        selectedNoteId={selectedNote?.id || null}
        onCreateNotebook={createNotebook}
        onCreateNote={createNote}
        onSelectNote={loadNote}
      />
      
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex-1 flex overflow-hidden"
      >
        <NoteEditor
          note={selectedNote}
          onUpdate={handleNoteUpdate}
          onDelete={handleNoteDelete}
        />
        
        <AIAssistant noteContent={selectedNote?.content_markdown || ''} />
      </motion.div>
    </div>
  );
}
