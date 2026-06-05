# Render Blocks

Output interactive, visual content inline using a `render` fenced code block. The iframe automatically inherits the user's active theme.

## Use for
- Charts, data visualizations
- Calculators, interactive tools, sliders
- Simulations, physics demos, animations
- Games, timelines, dashboards

Do NOT use for plain text or anything that reads fine as markdown.

For controls **do not** use arrow keys.
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

## Design

Use the render block as a canvas. Commit to a direction — generic is the failure mode.

### Aesthetic direction

Before building, pick a tone: **brutally minimal**, **editorial**, **playful**, **data-dense**, **retro-futuristic**, **luxury**, etc. Every visual choice should serve that direction. Ask: what's the one thing someone will remember?

### Typography

- Use `var(--font-d)` for display headings and `var(--font)` for body — the contrast between them is free character
- Weight hierarchy: heading `700`, subheading `600`, body `400`. Flat scales look unprofessional
- Scale contrast between heading and body should be at least 1.25×

### Color

- Commit: let the accent dominate one focal element rather than distributing it evenly everywhere
- Use `color-mix(in srgb, var(--acc) 12%, var(--sf2))` for tinted accent surfaces without a hardcoded color
- Status tokens (`var(--success)`, `var(--danger)`, `var(--warning)`) are semantic — use for state, not decoration

### Motion

- **One well-orchestrated entry beats scattered micro-interactions.** Stagger list items with `animation-delay` in 40–60ms steps.
- Entering elements: `ease-out` with `cubic-bezier(0.23, 1, 0.32, 1)`. **Never `ease-in`** — it starts slow and feels broken.
- Never animate from `scale(0)`. Start at `scale(0.95)` + `opacity: 0`.
- Buttons: `transform: scale(0.97)` on `:active` gives instant press feedback.
- Duration: small elements 125–150ms, cards/panels 200–250ms. Nothing above 300ms for UI.

```css
/* Standard stagger pattern */
@keyframes fadeUp {
  from { opacity: 0; transform: translateY(6px); }
  to   { opacity: 1; transform: translateY(0); }
}
.item                { animation: fadeUp 260ms cubic-bezier(0.23,1,0.32,1) both; }
.item:nth-child(2)   { animation-delay: 50ms; }
.item:nth-child(3)   { animation-delay: 100ms; }
.item:nth-child(4)   { animation-delay: 150ms; }

/* Button press feedback */
.btn { transition: transform 140ms ease-out; }
.btn:active { transform: scale(0.97); }
```

### Layout

- Vary spacing for rhythm — don't pad every element identically
- Try asymmetric columns (`2fr 1fr`) or offset elements instead of uniform grids
- Generous negative space **or** tight controlled density — pick one direction, not the middle

### Avoid

- `transition: all` — always specify the property
- Gradient text (`background-clip: text`) — never meaningful
- `border-radius` > 16px on cards — reads as amateurish
- `border: 1px solid X` + wide `box-shadow` on the same element — pick one
- Identical card grids repeating the same icon + heading + text pattern
- `ease-in` on any UI element

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

### 4 — Quiz

```render
function App() {
  const questions = [
    { q: 'Which planet has the most moons?', opts: ['Jupiter', 'Saturn', 'Uranus', 'Neptune'], answer: 1 },
    { q: 'What is the approximate speed of light?', opts: ['300,000 km/s', '150,000 km/s', '450,000 km/s', '186,000 km/s'], answer: 0 },
    { q: 'Which element has the symbol Au?', opts: ['Silver', 'Aluminum', 'Gold', 'Argon'], answer: 2 },
  ]

  const [current, setCurrent] = useState(0)
  const [selected, setSelected] = useState(null)
  const [answers, setAnswers] = useState([])
  const [done, setDone] = useState(false)

  const q = questions[current]
  const isLast = current === questions.length - 1

  const handleNext = () => {
    const next = [...answers, selected]
    if (isLast) { setAnswers(next); setDone(true) }
    else { setAnswers(next); setCurrent(c => c + 1); setSelected(null) }
  }

  const reset = () => { setCurrent(0); setSelected(null); setAnswers([]); setDone(false) }

  if (done) {
    const score = answers.filter((a, i) => a === questions[i].answer).length
    return (
      <div style={{ animation: 'fadeUp 300ms cubic-bezier(0.23,1,0.32,1) both' }}>
        <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}.opt-btn{transition:transform 140ms ease-out}.opt-btn:active{transform:scale(0.97)}`}</style>
        <div style={{ textAlign: 'center', padding: 'var(--pad-lg) 0 var(--pad-md)' }}>
          <div style={{ fontSize: 'calc(var(--fs) - 1px)', color: 'var(--tx3)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.08em' }}>Score</div>
          <div style={{ fontSize: 'calc(var(--fs) + 28px)', fontWeight: 700, color: 'var(--acc)', lineHeight: 1 }}>{score}/{questions.length}</div>
          <div style={{ color: 'var(--tx3)', marginTop: 8 }}>
            {score === questions.length ? 'Perfect!' : score >= 2 ? 'Nice work!' : 'Keep studying!'}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 'var(--pad-md)' }}>
          {questions.map((q, qi) => {
            const correct = answers[qi] === q.answer
            return (
              <div key={qi} className="card" style={{ borderColor: correct ? 'color-mix(in srgb,var(--success) 40%,var(--bd))' : 'color-mix(in srgb,var(--danger) 40%,var(--bd))', animation: `fadeUp 280ms cubic-bezier(0.23,1,0.32,1) ${qi * 60}ms both` }}>
                <div style={{ fontSize: 'calc(var(--fs) - 1px)', color: 'var(--tx3)', marginBottom: 4 }}>{q.q}</div>
                <div style={{ fontWeight: 500, color: correct ? 'var(--success)' : 'var(--danger)' }}>
                  {correct ? '✓ ' : '✗ '}{q.opts[answers[qi]]}
                  {!correct && <span style={{ color: 'var(--tx3)', fontWeight: 400 }}> · Correct: {q.opts[q.answer]}</span>}
                </div>
              </div>
            )
          })}
        </div>
        <button className="btn btn-accent opt-btn" onClick={reset}>Retake quiz</button>
      </div>
    )
  }

  return (
    <>
      <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}.opt-btn{transition:border-color 0.15s,background 0.15s,transform 140ms ease-out}.opt-btn:not([disabled]):active{transform:scale(0.97)}`}</style>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--pad-md)' }}>
        <span style={{ color: 'var(--tx3)', fontSize: 'calc(var(--fs) - 1px)' }}>Question {current + 1} of {questions.length}</span>
        <div style={{ display: 'flex', gap: 5 }}>
          {questions.map((_, i) => (
            <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: i <= current ? 'var(--acc)' : 'var(--bd2)', transition: 'background 0.2s' }} />
          ))}
        </div>
      </div>
      <h2 style={{ marginBottom: 'var(--pad-md)', lineHeight: 1.4, animation: 'fadeUp 260ms cubic-bezier(0.23,1,0.32,1) both' }}>{q.q}</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 'var(--pad-md)' }}>
        {q.opts.map((opt, i) => {
          const isSelected = selected === i
          const revealCorrect = selected !== null && i === q.answer
          const revealWrong = selected !== null && isSelected && i !== q.answer
          return (
            <button key={i} className="opt-btn" onClick={() => selected === null && setSelected(i)}
              style={{
                textAlign: 'left', padding: '10px 14px', borderRadius: 'var(--r)',
                border: `1px solid ${revealCorrect ? 'color-mix(in srgb,var(--success) 60%,var(--bd))' : revealWrong ? 'var(--danger-border)' : isSelected ? 'var(--acc-border)' : 'var(--bd)'}`,
                background: revealCorrect ? 'color-mix(in srgb,var(--success) 10%,var(--sf2))' : revealWrong ? 'var(--danger-bg)' : isSelected ? 'var(--acc-soft)' : 'var(--sf2)',
                color: revealCorrect ? 'var(--success)' : revealWrong ? 'var(--danger)' : isSelected ? 'var(--acc)' : 'var(--tx)',
                cursor: selected !== null ? 'default' : 'pointer',
                fontFamily: 'var(--font)', fontSize: 'var(--fs)',
                animation: `fadeUp 260ms cubic-bezier(0.23,1,0.32,1) ${i * 50}ms both`,
              }}>{opt}</button>
          )
        })}
      </div>
      <button className="btn btn-accent opt-btn" disabled={selected === null} onClick={handleNext}
        style={{ opacity: selected === null ? 0.4 : 1, cursor: selected === null ? 'not-allowed' : 'pointer' }}>
        {isLast ? 'See results' : 'Next question'}
      </button>
    </>
  )
}
```

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
