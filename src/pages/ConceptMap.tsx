import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import ForceGraph2D from 'react-force-graph-2d';
import { Brain, ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Concept {
  id: string;
  name: string;
  type: string;
  description: string;
}

interface ConceptEdge {
  id: string;
  from_concept_id: string;
  to_concept_id: string;
  relation: string;
}

interface GraphNode {
  id: string;
  name: string;
  type: string;
  val: number;
}

interface GraphLink {
  source: string;
  target: string;
  relation: string;
}

export default function ConceptMap() {
  const { user, loading: authLoading } = useAuth();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const { toast } = useToast();
  const graphRef = useRef<any>(null);

  const [concepts, setConcepts] = useState<Concept[]>([]);
  const [edges, setEdges] = useState<ConceptEdge[]>([]);
  const [selectedConcept, setSelectedConcept] = useState<Concept | null>(null);
  const [newConceptName, setNewConceptName] = useState('');
  const [newConceptType, setNewConceptType] = useState<string>('concept');
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    const [conceptsRes, edgesRes] = await Promise.all([
      supabase.from('concepts').select('*'),
      supabase.from('concept_edges').select('*'),
    ]);

    if (conceptsRes.data) setConcepts(conceptsRes.data);
    if (edgesRes.data) setEdges(edgesRes.data);
  };

  const graphData = {
    nodes: concepts.map((c) => ({
      id: c.id,
      name: c.name,
      type: c.type,
      val: c.type === 'formula' ? 15 : c.type === 'code' ? 12 : 10,
    })),
    links: edges.map((e) => ({
      source: e.from_concept_id,
      target: e.to_concept_id,
      relation: e.relation,
    })),
  };

  const getNodeColor = (node: GraphNode) => {
    const colors = {
      concept: theme === 'dark' ? '#f59e0b' : '#d97706',
      formula: theme === 'dark' ? '#3b82f6' : '#2563eb',
      code: theme === 'dark' ? '#10b981' : '#059669',
      experiment: theme === 'dark' ? '#8b5cf6' : '#7c3aed',
    };
    return colors[node.type as keyof typeof colors] || colors.concept;
  };

  const handleNodeClick = useCallback((node: GraphNode) => {
    const concept = concepts.find((c) => c.id === node.id);
    setSelectedConcept(concept || null);
  }, [concepts]);

  const createConcept = async () => {
    if (!user || !newConceptName.trim()) return;

    const { data, error } = await supabase
      .from('concepts')
      .insert({
        user_id: user.id,
        name: newConceptName,
        type: newConceptType as 'concept' | 'formula' | 'code' | 'experiment',
        description: '',
      })
      .select()
      .single();

    if (error) {
      toast({
        title: 'Error creating concept',
        description: error.message,
        variant: 'destructive',
      });
      return;
    }

    setConcepts((prev) => [...prev, data]);
    setNewConceptName('');
    setDialogOpen(false);
    toast({ title: 'Concept created' });
  };

  const deleteConcept = async (id: string) => {
    const { error } = await supabase.from('concepts').delete().eq('id', id);

    if (error) {
      toast({
        title: 'Error deleting concept',
        description: error.message,
        variant: 'destructive',
      });
      return;
    }

    setConcepts((prev) => prev.filter((c) => c.id !== id));
    setSelectedConcept(null);
    toast({ title: 'Concept deleted' });
  };

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
              <Brain className="w-8 h-8 text-accent" />
              <span className="text-xl font-serif font-bold">Concept Map</span>
            </div>
          </div>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="hero">
                <Plus className="w-4 h-4 mr-2" />
                Add Concept
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Concept</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input
                    value={newConceptName}
                    onChange={(e) => setNewConceptName(e.target.value)}
                    placeholder="Enter concept name"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select value={newConceptType} onValueChange={setNewConceptType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="concept">Concept</SelectItem>
                      <SelectItem value="formula">Formula</SelectItem>
                      <SelectItem value="code">Code</SelectItem>
                      <SelectItem value="experiment">Experiment</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={createConcept} className="w-full">
                  Create Concept
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      {/* Graph Container */}
      <div className="pt-16 h-screen">
        <ForceGraph2D
          ref={graphRef}
          graphData={graphData}
          nodeLabel="name"
          nodeColor={getNodeColor}
          nodeRelSize={6}
          linkColor={() => theme === 'dark' ? '#475569' : '#94a3b8'}
          linkWidth={2}
          linkDirectionalArrowLength={6}
          linkDirectionalArrowRelPos={1}
          onNodeClick={handleNodeClick}
          backgroundColor={theme === 'dark' ? '#0a0f1a' : '#faf8f5'}
          nodeCanvasObject={(node: any, ctx, globalScale) => {
            const label = node.name;
            const fontSize = 12 / globalScale;
            ctx.font = `${fontSize}px Inter`;
            
            const nodeR = Math.sqrt(node.val) * 4;
            
            // Draw node
            ctx.beginPath();
            ctx.arc(node.x, node.y, nodeR, 0, 2 * Math.PI);
            ctx.fillStyle = getNodeColor(node);
            ctx.fill();
            
            // Draw label
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = theme === 'dark' ? '#f8fafc' : '#1e293b';
            ctx.fillText(label, node.x, node.y + nodeR + fontSize);
          }}
        />
      </div>

      {/* Selected Concept Panel */}
      {selectedConcept && (
        <motion.div
          initial={{ x: 300, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 300, opacity: 0 }}
          className="fixed right-4 top-24 w-80 glass-card p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-serif font-semibold text-lg">{selectedConcept.name}</h3>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => deleteConcept(selectedConcept.id)}
              className="text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
          <div className="space-y-3">
            <div>
              <span className="text-xs text-muted-foreground uppercase tracking-wider">Type</span>
              <p className="text-sm font-medium capitalize">{selectedConcept.type}</p>
            </div>
            <div>
              <span className="text-xs text-muted-foreground uppercase tracking-wider">Description</span>
              <p className="text-sm">{selectedConcept.description || 'No description'}</p>
            </div>
          </div>
          <Button
            variant="outline"
            className="w-full mt-4"
            onClick={() => setSelectedConcept(null)}
          >
            Close
          </Button>
        </motion.div>
      )}
    </div>
  );
}
