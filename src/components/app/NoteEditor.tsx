import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Edit3, Eye, Save, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import MarkdownRenderer from './MarkdownRenderer';
import CodeBlock from './CodeBlock';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Note {
  id: string;
  title: string;
  content_markdown: string;
  notebook_id: string;
}

interface NoteEditorProps {
  note: Note | null;
  onUpdate: () => void;
  onDelete: (noteId: string) => void;
}

export default function NoteEditor({ note, onUpdate, onDelete }: NoteEditorProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');
  const { toast } = useToast();

  useEffect(() => {
    if (note) {
      setTitle(note.title);
      setContent(note.content_markdown || '');
    }
  }, [note]);

  const handleSave = async () => {
    if (!note) return;
    setSaving(true);

    const { error } = await supabase
      .from('notes')
      .update({ title, content_markdown: content })
      .eq('id', note.id);

    if (error) {
      toast({
        title: 'Error saving note',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Note saved',
        description: 'Your changes have been saved.',
      });
      onUpdate();
    }

    setSaving(false);
  };

  const handleDelete = async () => {
    if (!note) return;
    
    const { error } = await supabase.from('notes').delete().eq('id', note.id);

    if (error) {
      toast({
        title: 'Error deleting note',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Note deleted',
      });
      onDelete(note.id);
    }
  };

  // Extract code blocks from content for execution
  const extractCodeBlocks = (markdown: string) => {
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
    const blocks: { language: string; code: string }[] = [];
    let match;
    
    while ((match = codeBlockRegex.exec(markdown)) !== null) {
      blocks.push({
        language: match[1] || 'text',
        code: match[2].trim(),
      });
    }
    
    return blocks;
  };

  const codeBlocks = note ? extractCodeBlocks(content) : [];
  const pythonBlocks = codeBlocks.filter(b => b.language === 'python');

  if (!note) {
    return (
      <div className="flex-1 flex items-center justify-center bg-canvas">
        <div className="text-center text-muted-foreground">
          <Edit3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg">Select a note to start editing</p>
          <p className="text-sm mt-1">Or create a new note from the sidebar</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex-1 flex flex-col bg-canvas overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-panel">
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="text-xl font-serif font-bold border-none bg-transparent px-0 focus-visible:ring-0 max-w-lg"
          placeholder="Note title..."
        />
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDelete}
            className="text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
          <Button variant="default" size="sm" onClick={handleSave} disabled={saving}>
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'edit' | 'preview')} className="h-full flex flex-col">
          <div className="px-6 pt-4">
            <TabsList className="bg-muted">
              <TabsTrigger value="edit" className="gap-2">
                <Edit3 className="w-4 h-4" />
                Edit
              </TabsTrigger>
              <TabsTrigger value="preview" className="gap-2">
                <Eye className="w-4 h-4" />
                Preview
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="edit" className="flex-1 m-0 p-6 overflow-auto">
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-[500px] font-mono text-sm resize-none border-border bg-panel"
              placeholder="Write your notes in Markdown...

# Heading
## Subheading

Use LaTeX for math:
$E = mc^2$

$$\int_0^\infty e^{-x^2} dx = \frac{\sqrt{\pi}}{2}$$

Add code blocks:
```python
print('Hello, World!')
```"
            />
          </TabsContent>

          <TabsContent value="preview" className="flex-1 m-0 overflow-auto">
            <div className="p-6 max-w-4xl">
              <MarkdownRenderer content={content} />
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Code Execution Dock */}
      {pythonBlocks.length > 0 && (
        <div className="border-t border-border bg-panel">
          <div className="p-4">
            <h3 className="text-sm font-medium mb-3 text-muted-foreground">Code Blocks</h3>
            <div className="space-y-4 max-h-64 overflow-y-auto">
              {pythonBlocks.map((block, index) => (
                <CodeBlock
                  key={index}
                  code={block.code}
                  language={block.language}
                  noteId={note.id}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
