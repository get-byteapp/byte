# Render Blocks

Output interactive, visual content inline using a `render` fenced code block. The iframe automatically inherits the user's active theme.

## Use for
- Charts, data visualizations
- Calculators, interactive tools, sliders
- Simulations, physics demos, animations
- Games, timelines, dashboards

Do NOT use for plain text or anything that reads fine as markdown.

---

## Format

The render block contains React component code. Define `function App()` as the root — it is mounted automatically. No imports, no `ReactDOM.createRoot` call needed.

```render
function App() {
  // hooks available: useState useEffect useRef useMemo useCallback
  //                  useReducer createContext useContext Fragment
  return (
    <div>
      {/* JSX here — use className not class */}
    </div>
  )
}
```

**CSS vars work in JSX inline styles:**
```jsx
style={{ color: 'var(--tx)', background: 'var(--sf)', borderRadius: 'var(--r)' }}
```
Use `BYTE.*` only in Canvas/Chart.js contexts where CSS vars don't work.

**HTML mode fallback:** If your content starts with `<!DOCTYPE html>`, it renders as plain HTML (use this for Chart.js loaded via `<script>` in head, or complex canvas setups). See HTML mode section at the bottom.

---

## Non-negotiable rules

1. EXACTLY THREE backticks to open and close.
2. Define `function App()` as root — no imports, no `ReactDOM.createRoot`.
3. **Zero hardcoded colors** — every color is a CSS `var(--token)` or `BYTE.token`.
4. **Zero hardcoded font names or sizes** — always `var(--font)`, `var(--fs)`, `calc(var(--fs) + Npx)`.
5. **Zero hardcoded border-radius** — always `var(--r)`, `var(--r-sm)`, `var(--r-lg)`.
6. Spacing: prefer `var(--pad-xs/sm/md/lg)` over arbitrary pixel values.
7. Use `BYTE.*` in all JS/Canvas/Chart.js contexts (CSS vars don't work there).
8. No `fetch()` calls.
9. Use `style={{ background: 'var(--bg)' }}` on wrapper divs — do not override with a hardcoded color.
10. Width 100%, no fixed widths wider than 600px.
11. One render block per response.
12. Never use `<table>` for form layout — use `.form-row` + `.form-group`.
13. Wrap read-only data tables in `<div class="table-wrap">`.

---

## CSS tokens — use in HTML/CSS

```
/* Backgrounds */
var(--bg)          page background (matches app)
var(--sf)          card surface
var(--sf2)         deeper surface (inputs, nested cards)
var(--sf3)         deepest surface

/* Borders */
var(--bd)          default border
var(--bd2)         stronger border

/* Text */
var(--tx)          primary text
var(--tx2)         secondary text
var(--tx3)         muted / label text
var(--tx4)         very subtle text

/* Accent */
var(--acc)         brand accent color
var(--acc-soft)    accent at low opacity
var(--acc-border)  accent border (50% opacity)
var(--acc-hover)   accent hover state

/* Status */
var(--danger)      red
var(--danger-bg)   red tint background
var(--warning)     orange
var(--success)     green

/* Typography */
var(--font)        primary font
var(--font-d)      display / serif font
var(--fs)          base font size

/* Shape & spacing */
var(--r)           default border-radius
var(--r-sm)        small radius
var(--r-lg)        large radius
var(--pad-xs)      4px
var(--pad-sm)      8px
var(--pad-md)      14px
var(--pad-lg)      24px
var(--ease)        transition easing
```

---

## window.BYTE tokens — use in JS / Canvas / Chart.js

CSS `var()` does not work in Canvas or Chart.js. Use `window.BYTE` which has the same values pre-resolved as strings (e.g. `"#a78bfa"`):

```
BYTE.bg    BYTE.sf    BYTE.sf2   BYTE.sf3
BYTE.bd    BYTE.bd2
BYTE.tx    BYTE.tx2   BYTE.tx3   BYTE.tx4
BYTE.acc   BYTE.accSoft  BYTE.accBorder  BYTE.accGlow  BYTE.accHover
BYTE.danger  BYTE.dangerBg  BYTE.dangerFill
BYTE.warning  BYTE.success
BYTE.font  BYTE.fontD  BYTE.fs   BYTE.r   BYTE.rSm  BYTE.rLg
```

**Suggest prompt to user:** Use `BYTE.suggestPrompt(text)` to populate the chat input with a follow-up question. Useful for buttons that guide the user to the next step:

```jsx
<button className="btn" onClick={() => BYTE.suggestPrompt('Tell me more about emergent capabilities')}>
  More Info
</button>
```

When clicked, the text appears in the chat input box — the user reviews it and presses Enter to send.

**Chart.js scale config (copy this every time):**
```js
scales: {
  x: { ticks: { color: BYTE.tx3, font: { family: BYTE.font } }, grid: { color: BYTE.bd } },
  y: { ticks: { color: BYTE.tx3, font: { family: BYTE.font } }, grid: { color: BYTE.bd } }
},
plugins: { legend: { labels: { color: BYTE.tx2, font: { family: BYTE.font } } } }
```

---

## Built-in CSS classes — available in every render block

```
Layout
  .grid / .grid-2 / .grid-3   responsive grid (collapses to 1-col on narrow)
  .flex / .flex-col            flexbox row / column

Cards & stats
  .card                        surface card (sf2 bg + border + radius + padding)
  .stat / .stat-label / .stat-value / .stat-sub

Forms
  .form-group                  label + input column
  .form-row                    responsive grid of form-groups (auto-fit, min 120px)
  .input-group                 input + button side-by-side

Controls row (for simulations / demos)
  .controls                    flex row, wraps, gap 8px, margin-bottom 12px

Results
  .result-box / .result-label / .result-value

Buttons
  .btn                         default button
  .btn-accent                  accent-colored button

Badges
  .badge / .badge-accent / .badge-success / .badge-danger

Section
  .section-title               uppercase muted label
  .table-wrap                  scrollable table container

Spacing helpers
  .mt / .mb / .mt-lg / .mb-lg
  hr                           themed divider

Utility
  .accent .success .danger .bold .center .muted
```

Inputs, selects, textareas, tables, th, td are all auto-styled — no extra CSS needed.

---

## Examples

### 1 — Stat cards + Chart.js bar chart

```render
function App() {
  useEffect(() => {
    const script = document.createElement('script')
    script.src = 'https://cdn.jsdelivr.net/npm/chart.js'
    script.onload = () => {
      new window.Chart(document.getElementById('c'), {
        type: 'bar',
        data: {
          labels: ['Jan', 'Feb', 'Mar', 'Apr'],
          datasets: [{ label: 'Sales ($)', data: [12400, 15800, 11200, 9800],
            backgroundColor: BYTE.acc, borderRadius: 6, borderSkipped: false }]
        },
        options: {
          responsive: true,
          plugins: { legend: { labels: { color: BYTE.tx2, font: { family: BYTE.font, size: 11 } } } },
          scales: {
            x: { ticks: { color: BYTE.tx3, font: { family: BYTE.font, size: 11 } }, grid: { color: BYTE.bd } },
            y: { ticks: { color: BYTE.tx3, font: { family: BYTE.font, size: 11 }, callback: v => '$' + v.toLocaleString() }, grid: { color: BYTE.bd } }
          }
        }
      })
    }
    document.head.appendChild(script)
  }, [])

  return (
    <>
      <div className="grid grid-3 mb">
        <div className="stat">
          <div className="stat-label">Total</div>
          <div className="stat-value">$49,200</div>
        </div>
        <div className="stat">
          <div className="stat-label">Monthly avg</div>
          <div className="stat-value">$12,300</div>
        </div>
        <div className="stat">
          <div className="stat-label">Best month</div>
          <div className="stat-value accent">Feb · $15,800</div>
        </div>
      </div>
      <canvas id="c" height="220"></canvas>
    </>
  )
}
```

---

### 2 — Calculator

```render
function App() {
  const [rows, setRows] = useState([
    { subject: 'Math', grade: 'A', credits: 3 },
    { subject: 'English', grade: 'B+', credits: 3 },
    { subject: 'Physics', grade: 'A-', credits: 4 },
  ])
  const [result, setResult] = useState(null)

  const gradeMap = { 'A+':4.3,'A':4.0,'A-':3.7,'B+':3.3,'B':3.0,'B-':2.7,'C+':2.3,'C':2.0,'C-':1.7,'D':1.0,'F':0 }
  const grades = Object.keys(gradeMap)

  const update = (i, field, val) =>
    setRows(r => r.map((row, idx) => idx === i ? { ...row, [field]: val } : row))

  const calc = () => {
    let points = 0, total = 0
    rows.forEach(({ grade, credits }) => {
      const c = parseFloat(credits) || 0
      points += (gradeMap[grade] ?? 0) * c
      total += c
    })
    setResult(total ? (points / total).toFixed(2) : null)
  }

  return (
    <>
      <h2>GPA Calculator</h2>
      {rows.map((row, i) => (
        <div key={i} className="form-row mt">
          <div className="form-group">
            <label>Subject</label>
            <input value={row.subject} onChange={e => update(i, 'subject', e.target.value)} placeholder="e.g. Math" />
          </div>
          <div className="form-group">
            <label>Grade</label>
            <select value={row.grade} onChange={e => update(i, 'grade', e.target.value)}>
              {grades.map(g => <option key={g}>{g}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Credits</label>
            <input type="number" value={row.credits} min="1" max="6"
              onChange={e => update(i, 'credits', e.target.value)} />
          </div>
          <div className="form-group" style={{ justifyContent: 'flex-end' }}>
            <label>&nbsp;</label>
            <button className="btn" style={{ alignSelf: 'flex-end' }}
              onClick={() => setRows(r => r.filter((_, idx) => idx !== i))}>✕</button>
          </div>
        </div>
      ))}
      <div className="flex mt">
        <button className="btn" onClick={() => setRows(r => [...r, { subject: '', grade: 'A', credits: 3 }])}>
          + Add course
        </button>
        <button className="btn-accent btn" onClick={calc}>Calculate GPA</button>
      </div>
      {result && (
        <div className="result-box mt-lg">
          <div className="result-label">Cumulative GPA</div>
          <div className="result-value">{result}</div>
        </div>
      )}
    </>
  )
}
```

---

### 3 — Canvas simulation / animation

```render
function App() {
  const canvasRef = useRef(null)
  const ballsRef = useRef([])
  const COLORS = [BYTE.acc, BYTE.success, BYTE.warning, BYTE.danger]

  function addBall(canvas) {
    ballsRef.current.push({
      x: 40 + Math.random() * (canvas.width - 80),
      y: 40 + Math.random() * (canvas.height * 0.4),
      vx: (Math.random() - 0.5) * 5,
      vy: Math.random() * 2,
      r: 10 + Math.random() * 14,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
    })
  }

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')

    function resize() {
      canvas.width = canvas.offsetWidth
      canvas.height = Math.round(canvas.offsetWidth * 0.55)
    }
    resize()
    window.addEventListener('resize', resize)
    for (let i = 0; i < 8; i++) addBall(canvas)

    let raf
    function tick() {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      for (const b of ballsRef.current) {
        b.vy += 0.25; b.x += b.vx; b.y += b.vy
        if (b.x - b.r < 0)             { b.x = b.r;               b.vx =  Math.abs(b.vx) }
        if (b.x + b.r > canvas.width)  { b.x = canvas.width - b.r; b.vx = -Math.abs(b.vx) }
        if (b.y + b.r > canvas.height) { b.y = canvas.height - b.r; b.vy = -Math.abs(b.vy) * 0.82 }
        ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2)
        ctx.fillStyle = b.color; ctx.fill()
      }
      raf = requestAnimationFrame(tick)
    }
    tick()
    return () => { window.removeEventListener('resize', resize); cancelAnimationFrame(raf) }
  }, [])

  return (
    <>
      <div className="flex mb" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0 }}>Physics Demo</h2>
        <div className="controls" style={{ margin: 0 }}>
          <button className="btn" onClick={() => addBall(canvasRef.current)}>+ Ball</button>
          <button className="btn" onClick={() => ballsRef.current.length = 0}>Clear</button>
        </div>
      </div>
      <canvas ref={canvasRef}
        style={{ width: '100%', borderRadius: 'var(--r)', border: '1px solid var(--bd)', display: 'block' }} />
    </>
  )
}
```

**Canvas sizing rule:** Always set `canvas.width = canvas.offsetWidth` in a `resize()` called after layout. Never set `canvas.width = "100%"`.

---

## HTML mode (fallback)

If the render block starts with `<!DOCTYPE html>`, it renders as plain HTML. Use this when you need Chart.js loaded via `<script src>` in `<head>`, or for canvas setups that don't fit React.

All token injection (CSS vars, `window.BYTE`, BASE_STYLES) is still applied automatically.

```render
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Chart</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
</head>
<body>
  <canvas id="c" height="260"></canvas>
  <script>
    new Chart(document.getElementById('c'), { /* ... */ })
  </script>
</body>
</html>
```
