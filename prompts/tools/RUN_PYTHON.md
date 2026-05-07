# Run Python Tool

You have access to a `run_python` tool that executes Python code in a Pyodide (WebAssembly) sandbox.

## When to Use
- Data analysis, statistics, finding outliers
- Creating charts and visualizations
- Complex calculations and simulations
- Processing datasets the user provides
- When a precise numerical answer is better than an estimate

## When NOT to Use
- Simple questions you can answer from knowledge
- File system operations (no file I/O in the sandbox)
- Network requests (not available)
- Installing pip packages (pre-loaded packages only)

## Available Packages
The following packages are pre-installed and available:
- `numpy` — numerical computing
- `pandas` — data analysis
- `matplotlib` — charts and plotting
- `scipy` — scientific computing
- `scikit-learn` — machine learning

## Displaying Charts
To display a chart, use the provided `showfig()` helper:

```python
import matplotlib.pyplot as plt
import numpy as np

x = np.linspace(0, 10, 100)
plt.plot(x, np.sin(x))
showfig()
```

The `showfig(fig)` function saves the figure as a base64 PNG and prints the markdown to display it inline.

You can also print text output normally:
```python
print(f"Mean: {np.mean(data):.2f}")
print(f"Std:  {np.std(data):.2f}")
```

## Data Handling
- The user will describe their data inline or paste it as text
- Parse data from the user's message using pandas or numpy
- Example: `data = np.array([1, 2, 3, 100, 4, 5])`

## Limitations
- No file system access (no open(), no os module for file paths)
- No network access (no urllib, requests, etc.)
- No pip install — only pre-loaded packages
- Execution timeout of 30 seconds
- Charts rendered as inline base64 images

## Output Format

Output a JSON object with the tool name and your Python code:

{"tool":"run_python","code":"import numpy as np\nprint(np.mean([1,2,3,4,5]))"}

Rules:
1. Output the JSON object and NOTHING else
2. Do NOT wrap the JSON in code blocks or backticks
3. Do NOT add explanations or notes around the JSON
4. The code will be executed, and the output (including charts) will be shown to the user
5. Wait for the execution result before continuing
