import { useState, useEffect } from 'react';
import { Play, Loader2, AlertCircle, CheckCircle, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import CodeMirror from '@uiw/react-codemirror';
import { python } from '@codemirror/lang-python';
import { supabase } from '@/integrations/supabase/client';
import { usePyodide } from '@/hooks/use-pyodide';

interface CodeBlockProps {
  code: string;
  language: string;
  noteId: string;
}

export default function CodeBlock({ code, language, noteId }: CodeBlockProps) {
  const [output, setOutput] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const { ready, loading: pyodideLoading, runPython } = usePyodide();

  const runCode = async () => {
    if (language !== 'python') {
      setError('Only Python execution is supported. Other languages coming soon!');
      return;
    }

    if (!ready) {
      setError('Python runtime is still loading. Please wait...');
      return;
    }

    setRunning(true);
    setOutput(null);
    setError(null);

    try {
      const result = await runPython(code);
      
      if (result.stdout) {
        setOutput(result.stdout);
      } else if (!result.stderr) {
        setOutput('(no output)');
      }
      
      if (result.stderr) {
        setError(result.stderr);
      }

      // Log the code run to database
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('code_runs').insert({
          note_id: noteId,
          language: 'python',
          code,
          stdout: result.stdout || '',
          stderr: result.stderr || '',
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Execution error');
    }

    setRunning(false);
  };

  const getButtonText = () => {
    if (running) return 'Running...';
    if (pyodideLoading) return 'Loading Python...';
    return 'Run';
  };

  return (
    <div className="rounded-lg border border-border overflow-hidden bg-code-bg">
      <div className="flex items-center justify-between px-3 py-2 bg-muted/50 border-b border-border">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-muted-foreground uppercase">{language}</span>
          {pyodideLoading && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Loader2 className="w-3 h-3 animate-spin" />
              Loading runtime...
            </span>
          )}
          {ready && !pyodideLoading && (
            <span className="text-xs text-success flex items-center gap-1">
              <CheckCircle className="w-3 h-3" />
              Ready
            </span>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={runCode}
          disabled={running || language !== 'python' || !ready}
          className="h-7 text-xs"
        >
          {running ? (
            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
          ) : (
            <Play className="w-3 h-3 mr-1" />
          )}
          {getButtonText()}
        </Button>
      </div>
      
      <div className="p-3">
        <CodeMirror
          value={code}
          extensions={[python()]}
          theme="dark"
          editable={false}
          basicSetup={{
            lineNumbers: true,
            highlightActiveLineGutter: false,
            highlightActiveLine: false,
          }}
          className="text-sm"
        />
      </div>

      {(output || error) && (
        <div className="border-t border-border p-3">
          <div className="flex items-center gap-2 mb-2">
            {error ? (
              <AlertCircle className="w-4 h-4 text-destructive" />
            ) : (
              <CheckCircle className="w-4 h-4 text-success" />
            )}
            <span className="text-xs font-medium text-muted-foreground">Output</span>
          </div>
          <pre className="text-sm font-mono whitespace-pre-wrap max-h-64 overflow-y-auto">
            {output && <span className="text-foreground">{output}</span>}
            {error && <span className="text-destructive block">{error}</span>}
          </pre>
        </div>
      )}
    </div>
  );
}
