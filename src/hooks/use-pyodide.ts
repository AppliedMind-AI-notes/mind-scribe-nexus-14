import { useState, useEffect, useCallback, useRef } from 'react';

interface PyodideInterface {
  runPythonAsync: (code: string) => Promise<unknown>;
  loadPackage: (packages: string | string[]) => Promise<void>;
  loadPackagesFromImports: (code: string) => Promise<void>;
  globals: {
    get: (key: string) => unknown;
    set: (key: string, value: unknown) => void;
  };
}

interface PyodideState {
  pyodide: PyodideInterface | null;
  loading: boolean;
  error: string | null;
  ready: boolean;
}

// Global singleton to avoid reloading Pyodide
let globalPyodide: PyodideInterface | null = null;
let loadingPromise: Promise<PyodideInterface> | null = null;

export function usePyodide() {
  const [state, setState] = useState<PyodideState>({
    pyodide: globalPyodide,
    loading: !globalPyodide,
    error: null,
    ready: !!globalPyodide,
  });

  useEffect(() => {
    if (globalPyodide) {
      setState({ pyodide: globalPyodide, loading: false, error: null, ready: true });
      return;
    }

    const loadPyodide = async () => {
      // If already loading, wait for that promise
      if (loadingPromise) {
        try {
          const py = await loadingPromise;
          setState({ pyodide: py, loading: false, error: null, ready: true });
        } catch (err) {
          setState(s => ({ ...s, loading: false, error: 'Failed to load Python runtime' }));
        }
        return;
      }

      // Start loading
      loadingPromise = new Promise(async (resolve, reject) => {
        try {
          // Dynamically load the Pyodide script
          const script = document.createElement('script');
          script.src = 'https://cdn.jsdelivr.net/pyodide/v0.24.1/full/pyodide.js';
          script.async = true;

          script.onload = async () => {
            try {
              // @ts-ignore - loadPyodide is added to window by the script
              const pyodide = await window.loadPyodide({
                indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.24.1/full/',
              });

              // Set up stdout/stderr capture
              await pyodide.runPythonAsync(`
import sys
from io import StringIO

class CaptureOutput:
    def __init__(self):
        self.stdout = StringIO()
        self.stderr = StringIO()
        
    def reset(self):
        self.stdout = StringIO()
        self.stderr = StringIO()
        
    def get_output(self):
        return self.stdout.getvalue(), self.stderr.getvalue()

_capture = CaptureOutput()
              `);

              globalPyodide = pyodide;
              resolve(pyodide);
            } catch (err) {
              reject(err);
            }
          };

          script.onerror = () => {
            reject(new Error('Failed to load Pyodide script'));
          };

          document.head.appendChild(script);
        } catch (err) {
          reject(err);
        }
      });

      try {
        const py = await loadingPromise;
        setState({ pyodide: py, loading: false, error: null, ready: true });
      } catch (err) {
        setState(s => ({ ...s, loading: false, error: 'Failed to load Python runtime' }));
        loadingPromise = null;
      }
    };

    loadPyodide();
  }, []);

  const runPython = useCallback(async (code: string): Promise<{ stdout: string; stderr: string }> => {
    if (!globalPyodide) {
      throw new Error('Python runtime not loaded');
    }

    const pyodide = globalPyodide;

    try {
      // Try to load any packages the code imports
      await pyodide.loadPackagesFromImports(code);
    } catch {
      // Ignore package loading errors - some packages may not be available
    }

    // Wrap the code to capture stdout/stderr
    const wrappedCode = `
import sys
from io import StringIO

_stdout_capture = StringIO()
_stderr_capture = StringIO()
_old_stdout = sys.stdout
_old_stderr = sys.stderr
sys.stdout = _stdout_capture
sys.stderr = _stderr_capture

_exec_error = None
try:
    exec(${JSON.stringify(code)})
except Exception as e:
    _exec_error = str(e)

sys.stdout = _old_stdout
sys.stderr = _old_stderr

_stdout_result = _stdout_capture.getvalue()
_stderr_result = _stderr_capture.getvalue()
if _exec_error:
    _stderr_result += _exec_error
`;

    await pyodide.runPythonAsync(wrappedCode);

    const stdout = String(pyodide.globals.get('_stdout_result') || '');
    const stderr = String(pyodide.globals.get('_stderr_result') || '');

    return { stdout, stderr };
  }, []);

  return {
    ...state,
    runPython,
  };
}
