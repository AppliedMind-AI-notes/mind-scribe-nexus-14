import { useState } from 'react';
import { Play, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import CodeMirror from '@uiw/react-codemirror';
import { python } from '@codemirror/lang-python';
import { supabase } from '@/integrations/supabase/client';

interface CodeBlockProps {
  code: string;
  language: string;
  noteId: string;
}

export default function CodeBlock({ code, language, noteId }: CodeBlockProps) {
  const [output, setOutput] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);

  const runCode = async () => {
    if (language !== 'python') {
      setError('Only Python execution is supported in MVP. Other languages coming soon!');
      return;
    }

    setRunning(true);
    setOutput(null);
    setError(null);

    // Simulate Python execution with simple eval-like behavior
    // In production, this would call a sandboxed execution service
    try {
      const result = simulatePythonExecution(code);
      setOutput(result.stdout);
      if (result.stderr) {
        setError(result.stderr);
      }

      // Log the code run
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('code_runs').insert({
          note_id: noteId,
          language: 'python',
          code,
          stdout: result.stdout,
          stderr: result.stderr || '',
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Execution error');
    }

    setRunning(false);
  };

  // Simple Python simulation for demo purposes
  const simulatePythonExecution = (code: string): { stdout: string; stderr?: string } => {
    const lines: string[] = [];
    const variables: Record<string, number | string> = {};

    // Parse and execute simple Python-like statements
    const codeLines = code.split('\n');
    
    for (const line of codeLines) {
      const trimmed = line.trim();
      
      // Skip empty lines and comments
      if (!trimmed || trimmed.startsWith('#')) continue;

      // Handle print statements
      const printMatch = trimmed.match(/print\s*\(\s*f?"([^"]*)"(?:\s*\.format\((.*?)\))?\s*\)/);
      if (printMatch) {
        let output = printMatch[1];
        // Handle f-string style formatting
        output = output.replace(/\{([^}]+):([^}]+)\}/g, (_, expr, format) => {
          const value = evaluateExpression(expr, variables);
          if (format.includes('%')) {
            return (Number(value) * 100).toFixed(format.match(/\.(\d+)/)?.[1] ? 1 : 0) + '%';
          }
          return String(value);
        });
        output = output.replace(/\{([^}]+)\}/g, (_, expr) => {
          return String(evaluateExpression(expr, variables));
        });
        lines.push(output);
        continue;
      }

      // Handle simple print with expressions
      const simplePrint = trimmed.match(/print\s*\((.*)\)/);
      if (simplePrint) {
        const expr = simplePrint[1];
        if (expr.startsWith('"') || expr.startsWith("'")) {
          lines.push(expr.slice(1, -1));
        } else {
          lines.push(String(evaluateExpression(expr, variables)));
        }
        continue;
      }

      // Handle variable assignments
      const assignMatch = trimmed.match(/^(\w+)\s*=\s*(.+)$/);
      if (assignMatch) {
        const [, name, expr] = assignMatch;
        variables[name] = evaluateExpression(expr, variables);
        continue;
      }

      // Handle function definitions (skip for simplicity)
      if (trimmed.startsWith('def ') || trimmed.startsWith('import ')) {
        continue;
      }
    }

    return { stdout: lines.join('\n') || '(no output)' };
  };

  const evaluateExpression = (expr: string, vars: Record<string, number | string>): number | string => {
    const trimmed = expr.trim();
    
    // Check if it's a variable
    if (vars[trimmed] !== undefined) {
      return vars[trimmed];
    }

    // Check if it's a number
    if (!isNaN(Number(trimmed))) {
      return Number(trimmed);
    }

    // Check if it's a string
    if ((trimmed.startsWith('"') && trimmed.endsWith('"')) ||
        (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
      return trimmed.slice(1, -1);
    }

    // Handle simple arithmetic
    try {
      // Replace variables in expression
      let evaluated = trimmed;
      for (const [key, value] of Object.entries(vars)) {
        evaluated = evaluated.replace(new RegExp(`\\b${key}\\b`, 'g'), String(value));
      }
      // Safe eval for simple math
      if (/^[\d\s+\-*/().]+$/.test(evaluated)) {
        return Function(`"use strict"; return (${evaluated})`)();
      }
    } catch {
      // Fall through
    }

    // Handle function calls like carnot_efficiency(T_hot, T_cold)
    const funcMatch = trimmed.match(/(\w+)\s*\((.*)\)/);
    if (funcMatch) {
      const [, funcName, args] = funcMatch;
      const argValues = args.split(',').map(a => evaluateExpression(a.trim(), vars));
      
      if (funcName === 'carnot_efficiency' && argValues.length >= 2) {
        const T_hot = Number(argValues[0]);
        const T_cold = Number(argValues[1]);
        if (T_hot > T_cold) {
          return 1 - (T_cold / T_hot);
        }
        return 0;
      }
    }

    return trimmed;
  };

  return (
    <div className="rounded-lg border border-border overflow-hidden bg-code-bg">
      <div className="flex items-center justify-between px-3 py-2 bg-muted/50 border-b border-border">
        <span className="text-xs font-mono text-muted-foreground uppercase">{language}</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={runCode}
          disabled={running || language !== 'python'}
          className="h-7 text-xs"
        >
          {running ? (
            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
          ) : (
            <Play className="w-3 h-3 mr-1" />
          )}
          Run
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
          <pre className="text-sm font-mono whitespace-pre-wrap">
            {output && <span className="text-foreground">{output}</span>}
            {error && <span className="text-destructive">{error}</span>}
          </pre>
        </div>
      )}
    </div>
  );
}
