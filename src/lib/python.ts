import { loadPyodide, PyodideInterface } from "pyodide";

let pyodide: PyodideInterface | null = null;
let loadingPromise: Promise<PyodideInterface> | null = null;

export async function ensurePyodide(): Promise<PyodideInterface> {
  if (pyodide) return pyodide;
  if (loadingPromise) return loadingPromise;
  loadingPromise = (async () => {
    const py = await loadPyodide({
      indexURL: "/pyodide/",
      packages: ["numpy", "pandas", "matplotlib", "scipy", "scikit-learn"],
    });

    py.runPython(`
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import io, base64, sys, json

def showfig(fig=None):
  if fig is None:
    fig = plt.gcf()
  buf = io.BytesIO()
  fig.savefig(buf, format='png', dpi=150, bbox_inches='tight')
  buf.seek(0)
  plt.close(fig)
  print(f"![chart](data:image/png;base64,{base64.b64encode(buf.read()).decode()})")
    `);

    pyodide = py;
    return py;
  })();
  return loadingPromise;
}

export interface PythonResult {
  stdout: string;
  error: string | null;
}

export async function runPython(code: string): Promise<PythonResult> {
  const py = await ensurePyodide();

  py.runPython(`
import sys, io as _io
_saved_stdout = sys.stdout
sys.stdout = _stdout_buffer = _io.StringIO()
  `);

  let error: string | null = null;
  try {
    await py.runPythonAsync(code);
  } catch (e) {
    error = String(e);
  }

  py.runPython(`
sys.stdout = _saved_stdout
  `);

  const stdout: string = py.globals.get("_stdout_buffer").call("getvalue");
  py.runPython(`
del _stdout_buffer, _saved_stdout, _io
  `);

  return { stdout, error };
}
