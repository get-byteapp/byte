# Canvas Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the post-completion canvas parser with a streaming-aware state machine that opens the side panel the moment a canvas fence is detected, streams content live, and works reliably regardless of tool use.

**Architecture:** A `StreamingCanvasParser` class processes chunks character-by-character, buffering per-line. When it detects a ` ```document ` or ` ```codefile ` fence, it emits typed events (`canvasStart`, `canvasChunk`, `canvasEnd`, `chatChunk`) consumed by ChatView's streaming loop to update store state in real time. Canvas parsing no longer happens in the completion callback or any tool branch — it happens per-chunk, always.

**Tech Stack:** TypeScript, React, Zustand (useStore), existing `streamChat` API, existing `updateChat` store action.

---

## File Map

| File | Change |
|------|--------|
| `src/types/index.ts` | Add `isStreaming?: boolean` to `CanvasDocument` |
| `src/lib/canvasParser.ts` | Full rewrite: `StreamingCanvasParser` class + `parseCanvasBlocks` wrapper |
| `src/components/shared/CanvasPreview.tsx` | Add `isStreaming?: boolean` prop; show animated "Writing…" when streaming |
| `src/components/shared/CanvasPanel.tsx` | Read `isStreaming` from active doc; plain-text + cursor in streaming mode |
| `src/components/views/ChatView.tsx` | Add parser refs; feed chunks to parser; handle events; remove all post-completion canvas parsing |
| `prompts/tools/CANVAS.md` | Remove `<canvas-link>` section (token system removed) |

---

## Task 1: Add `isStreaming` to `CanvasDocument` type

**Files:**
- Modify: `src/types/index.ts:96-102`

- [ ] **Open** `src/types/index.ts` and update `CanvasDocument`:

```typescript
export interface CanvasDocument {
  id: string;
  title: string;
  lang: string;
  content: string;
  updatedAt: number;
  isStreaming?: boolean;
}
```

- [ ] **Build check**

```bash
cd /Users/arnavsaini/Byte && npx tsc --noEmit 2>&1 | head -20
```

Expected: no new errors (existing errors, if any, unchanged).

- [ ] **Commit**

```bash
git add src/types/index.ts
git commit -m "feat(canvas): add isStreaming field to CanvasDocument type"
```

---

## Task 2: Rewrite `canvasParser.ts` with `StreamingCanvasParser`

**Files:**
- Modify: `src/lib/canvasParser.ts` (full rewrite)

The parser works character-by-character, buffering into a line buffer. On `\n`, it decides where the line goes. In `normal` mode it watches for canvas fence openers; in `in-canvas` mode it watches for the closing ` ``` `.

- [ ] **Rewrite** `src/lib/canvasParser.ts` in full:

```typescript
import type { CanvasDocument } from '../types'

export type ParserEvent =
  | { type: 'chatChunk'; text: string }
  | { type: 'canvasStart'; id: string; title: string; lang: string }
  | { type: 'canvasChunk'; id: string; text: string }
  | { type: 'canvasEnd'; id: string }

const OPEN_FENCE_RE = /^```(document|codefile)\s+(.+)$/
const CANVAS_LINK_RE = /^<canvas-link\s+title="[^"]+"\s*\/?>/

function parseAttrs(type: string, attrStr: string): { title: string; lang: string } {
  const titleMatch = /title="([^"]+)"/.exec(attrStr)
  const langMatch = /lang="([^"]+)"/.exec(attrStr)
  const title = titleMatch ? titleMatch[1] : 'Untitled'
  const lang = type === 'document' ? (langMatch?.[1] ?? 'markdown') : (langMatch?.[1] ?? 'text')
  return { title, lang }
}

export class StreamingCanvasParser {
  private mode: 'normal' | 'in-canvas' = 'normal'
  private lineBuffer = ''
  private currentDocId: string | null = null
  private seenTitles = new Map<string, string>()

  feed(chunk: string): ParserEvent[] {
    const events: ParserEvent[] = []

    for (const char of chunk) {
      if (char === '\n') {
        events.push(...this._processLine(this.lineBuffer))
        this.lineBuffer = ''
      } else {
        this.lineBuffer += char
      }
    }

    return events
  }

  finalize(): ParserEvent[] {
    const events: ParserEvent[] = []

    if (this.lineBuffer) {
      events.push(...this._processLine(this.lineBuffer))
      this.lineBuffer = ''
    }

    if (this.mode === 'in-canvas' && this.currentDocId) {
      events.push({ type: 'canvasEnd', id: this.currentDocId })
      this.mode = 'normal'
      this.currentDocId = null
    }

    return events
  }

  reset() {
    this.mode = 'normal'
    this.lineBuffer = ''
    this.currentDocId = null
    this.seenTitles = new Map()
  }

  private _processLine(line: string): ParserEvent[] {
    const events: ParserEvent[] = []

    if (this.mode === 'in-canvas') {
      if (line.trim() === '```') {
        events.push({ type: 'canvasEnd', id: this.currentDocId! })
        this.mode = 'normal'
        this.currentDocId = null
      } else {
        events.push({ type: 'canvasChunk', id: this.currentDocId!, text: line + '\n' })
      }
      return events
    }

    // normal mode
    const fenceMatch = OPEN_FENCE_RE.exec(line.trim())
    if (fenceMatch) {
      const [, type, attrStr] = fenceMatch
      const { title, lang } = parseAttrs(type, attrStr)
      const existingId = this.seenTitles.get(title)
      const id = existingId ?? crypto.randomUUID()
      this.seenTitles.set(title, id)
      this.currentDocId = id
      this.mode = 'in-canvas'
      events.push({ type: 'canvasStart', id, title, lang })
      events.push({ type: 'chatChunk', text: `CANVAS_PREVIEW_${id}\n` })
      return events
    }

    // Drop canvas-link lines silently
    if (CANVAS_LINK_RE.test(line.trim())) {
      return events
    }

    events.push({ type: 'chatChunk', text: line + '\n' })
    return events
  }
}

// One-shot wrapper for rehydrating stored messages
export function parseCanvasBlocks(raw: string): { content: string; documents: CanvasDocument[] } {
  const parser = new StreamingCanvasParser()
  const events = [...parser.feed(raw), ...parser.finalize()]

  let content = ''
  const documents: CanvasDocument[] = []

  for (const e of events) {
    if (e.type === 'chatChunk') {
      content += e.text
    } else if (e.type === 'canvasStart') {
      documents.push({ id: e.id, title: e.title, lang: e.lang, content: '', updatedAt: Date.now(), isStreaming: false })
    } else if (e.type === 'canvasChunk') {
      const doc = documents.find(d => d.id === e.id)
      if (doc) doc.content += e.text
    }
  }

  // Trim trailing newline added by line processor
  content = content.replace(/\n$/, '')

  return { content, documents }
}
```

- [ ] **Build check**

```bash
cd /Users/arnavsaini/Byte && npx tsc --noEmit 2>&1 | head -20
```

Expected: no new errors.

- [ ] **Commit**

```bash
git add src/lib/canvasParser.ts
git commit -m "feat(canvas): StreamingCanvasParser — line-buffered chunk-by-chunk parser"
```

---

## Task 3: Update `CanvasPreview` for streaming state

**Files:**
- Modify: `src/components/shared/CanvasPreview.tsx`
- Modify: `src/lib/markdown.tsx` (pass `isStreaming` to CanvasPreview)

- [ ] **Rewrite** `src/components/shared/CanvasPreview.tsx`:

```tsx
interface CanvasPreviewProps {
  title: string
  lang: string
  onOpen: () => void
  isStreaming?: boolean
}

function DocIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M5 2.5A1.5 1.5 0 0 1 6.5 1h5.379a1.5 1.5 0 0 1 1.06.44l2.622 2.621A1.5 1.5 0 0 1 16 5.12V17.5A1.5 1.5 0 0 1 14.5 19h-8A1.5 1.5 0 0 1 5 17.5v-15Z" fill="var(--sf3)" stroke="var(--bd2)" strokeWidth="1"/>
      <path d="M11.5 1v3.5a.5.5 0 0 0 .5.5H15.5" stroke="var(--bd2)" strokeWidth="1" strokeLinecap="round"/>
      <line x1="7.5" y1="9" x2="12.5" y2="9" stroke="var(--tx3)" strokeWidth="1" strokeLinecap="round"/>
      <line x1="7.5" y1="12" x2="12.5" y2="12" stroke="var(--tx3)" strokeWidth="1" strokeLinecap="round"/>
      <line x1="7.5" y1="15" x2="10.5" y2="15" stroke="var(--tx3)" strokeWidth="1" strokeLinecap="round"/>
    </svg>
  )
}

function CodeIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M5 2.5A1.5 1.5 0 0 1 6.5 1h5.379a1.5 1.5 0 0 1 1.06.44l2.622 2.621A1.5 1.5 0 0 1 16 5.12V17.5A1.5 1.5 0 0 1 14.5 19h-8A1.5 1.5 0 0 1 5 17.5v-15Z" fill="var(--sf3)" stroke="var(--bd2)" strokeWidth="1"/>
      <path d="M11.5 1v3.5a.5.5 0 0 0 .5.5H15.5" stroke="var(--bd2)" strokeWidth="1" strokeLinecap="round"/>
      <path d="M7.5 10.5 L9 12 L7.5 13.5" stroke="var(--acc)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
      <line x1="10.5" y1="14" x2="12.5" y2="9" stroke="var(--tx3)" strokeWidth="1" strokeLinecap="round"/>
    </svg>
  )
}

export function CanvasPreview({ title, lang, onOpen, isStreaming }: CanvasPreviewProps) {
  const isMarkdown = lang === 'markdown' || lang === 'md'
  const typeLabel = isMarkdown ? 'Document' : 'Code'
  const langLabel = isMarkdown ? 'MD' : lang.toUpperCase()

  return (
    <>
      <style>{`
        @keyframes canvas-writing-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        .canvas-writing-dot {
          animation: canvas-writing-pulse 1.2s ease-in-out infinite;
          display: inline-block;
        }
        .canvas-writing-dot:nth-child(2) { animation-delay: 0.2s; }
        .canvas-writing-dot:nth-child(3) { animation-delay: 0.4s; }
      `}</style>
      <div
        style={{
          border: '1px solid var(--bd)',
          borderRadius: 'var(--r-lg)',
          overflow: 'hidden',
          margin: '8px 0',
          background: 'var(--sf)',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '12px 14px',
          cursor: isStreaming ? 'default' : 'pointer',
          transition: 'border-color 150ms ease, background 150ms ease',
        }}
        onClick={isStreaming ? undefined : onOpen}
        onMouseEnter={isStreaming ? undefined : e => {
          (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--bd2)'
          ;(e.currentTarget as HTMLDivElement).style.background = 'var(--sf2)'
        }}
        onMouseLeave={isStreaming ? undefined : e => {
          (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--bd)'
          ;(e.currentTarget as HTMLDivElement).style.background = 'var(--sf)'
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 'var(--r-sm)',
            background: 'var(--sf2)',
            border: '1px solid var(--bd)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          {isMarkdown ? <DocIcon /> : <CodeIcon />}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 500, color: 'var(--tx)', fontSize: 'var(--fs)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {title}
          </div>
          <div style={{ fontSize: 11, color: 'var(--tx3)', marginTop: 2 }}>
            {isStreaming ? (
              <span>
                Writing
                <span className="canvas-writing-dot">.</span>
                <span className="canvas-writing-dot">.</span>
                <span className="canvas-writing-dot">.</span>
              </span>
            ) : (
              `${typeLabel} · ${langLabel}`
            )}
          </div>
        </div>

        {!isStreaming && (
          <button
            onClick={e => { e.stopPropagation(); onOpen() }}
            style={{
              padding: '5px 12px',
              borderRadius: 'var(--r-sm)',
              border: '1px solid var(--bd2)',
              background: 'var(--sf3)',
              color: 'var(--tx2)',
              fontSize: 12,
              fontFamily: 'var(--font)',
              cursor: 'pointer',
              flexShrink: 0,
              transition: 'all 140ms ease',
              whiteSpace: 'nowrap',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'var(--acc-soft)'
              e.currentTarget.style.borderColor = 'var(--acc-border)'
              e.currentTarget.style.color = 'var(--acc)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'var(--sf3)'
              e.currentTarget.style.borderColor = 'var(--bd2)'
              e.currentTarget.style.color = 'var(--tx2)'
            }}
          >
            Open
          </button>
        )}
      </div>
    </>
  )
}
```

- [ ] **Update** `src/lib/markdown.tsx` — pass `isStreaming` to `CanvasPreview` (find the `CANVAS_PREVIEW_` branch, currently around line 205-219):

```tsx
if (part.startsWith('CANVAS_PREVIEW_')) {
  const id = part.replace('CANVAS_PREVIEW_', '')
  const doc = canvasCtx.documents.find(d => d.id === id)
  if (!doc) return null
  return (
    <div key={index} style={{ overflowX: 'auto', maxWidth: '100%' }}>
      <CanvasPreview
        title={doc.title}
        lang={doc.lang}
        onOpen={() => canvasCtx.onOpen(id)}
        isStreaming={doc.isStreaming}
      />
    </div>
  )
}
```

- [ ] **Build check**

```bash
cd /Users/arnavsaini/Byte && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Commit**

```bash
git add src/components/shared/CanvasPreview.tsx src/lib/markdown.tsx
git commit -m "feat(canvas): CanvasPreview shows animated Writing... while streaming"
```

---

## Task 4: Update `CanvasPanel` for streaming mode

**Files:**
- Modify: `src/components/shared/CanvasPanel.tsx`

When the active document has `isStreaming: true`, render content as plain preformatted text with a blinking cursor. "Copy" is disabled. When `isStreaming` goes false, content switches to markdown/code rendering.

- [ ] **Replace the content section** of `CanvasPanel.tsx`. Find the `{/* Content */}` block (currently around line 224) and update the full file:

The `active` doc already has `isStreaming` on it. Read it directly:

```tsx
const isStreaming = active.isStreaming ?? false
```

Add CSS for the blinking cursor inside the `<style>` block (after `prefers-reduced-motion`):

```css
@keyframes canvas-cursor-blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}
.canvas-cursor {
  display: inline-block;
  width: 2px;
  height: 1.1em;
  background: var(--tx2);
  margin-left: 2px;
  vertical-align: text-bottom;
  animation: canvas-cursor-blink 900ms ease-in-out infinite;
}
@media (prefers-reduced-motion: reduce) {
  .canvas-cursor { animation: none; opacity: 1; }
}
```

Replace the `{/* Content */}` section:

```tsx
{/* Content */}
<div
  className="canvas-panel-content"
  style={{ flex: 1, overflow: 'auto', padding: '24px 28px' }}
>
  {isStreaming ? (
    <pre
      style={{
        fontFamily: 'var(--font-mono, monospace)',
        fontSize: 13,
        lineHeight: 1.7,
        color: 'var(--tx)',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
        margin: 0,
      }}
    >
      {active.content}
      <span className="canvas-cursor" />
    </pre>
  ) : isMarkdown ? (
    <div
      className="msg-txt"
      style={{ fontSize: 'calc(var(--fs) + 0.5px)', color: 'var(--tx)', lineHeight: 1.75 }}
    >
      <MarkdownRenderer content={active.content} />
    </div>
  ) : (
    <CodeBlock language={active.lang} code={active.content} noRun />
  )}
</div>
```

Update the Copy button to disable when streaming:

```tsx
<button
  onClick={isStreaming ? undefined : handleCopy}
  disabled={isStreaming}
  title={isStreaming ? 'Writing…' : 'Copy content'}
  style={{
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    padding: '5px 10px',
    borderRadius: 'var(--r-sm)',
    border: '1px solid var(--bd)',
    background: copied ? 'var(--acc-soft)' : 'var(--sf2)',
    color: isStreaming ? 'var(--tx3)' : (copied ? 'var(--acc)' : 'var(--tx2)'),
    cursor: isStreaming ? 'default' : 'pointer',
    fontSize: 11,
    fontFamily: 'var(--font)',
    transition: 'all 140ms ease',
    whiteSpace: 'nowrap',
    opacity: isStreaming ? 0.5 : 1,
  }}
  onMouseEnter={isStreaming || copied ? undefined : e => {
    e.currentTarget.style.background = 'var(--sf3)'
    e.currentTarget.style.borderColor = 'var(--bd2)'
  }}
  onMouseLeave={isStreaming || copied ? undefined : e => {
    e.currentTarget.style.background = 'var(--sf2)'
    e.currentTarget.style.borderColor = 'var(--bd)'
  }}
>
  <CopyIcon />
  {isStreaming ? 'Writing…' : (copied ? 'Copied' : 'Copy')}
</button>
```

- [ ] **Build check**

```bash
cd /Users/arnavsaini/Byte && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Commit**

```bash
git add src/components/shared/CanvasPanel.tsx
git commit -m "feat(canvas): CanvasPanel streams plain text with blinking cursor"
```

---

## Task 5: Wire `StreamingCanvasParser` into ChatView streaming loop

**Files:**
- Modify: `src/components/views/ChatView.tsx`

This is the core integration. Add two refs for the parser and the accumulated chat-side content. Reset them at the start of each streaming request. Feed each chunk through the parser and handle events.

- [ ] **Update import** at the top of `ChatView.tsx`. Find the existing canvasParser import line (currently `import { parseCanvasBlocks } from '../../lib/canvasParser'`) and replace it with:

```typescript
import { StreamingCanvasParser, parseCanvasBlocks } from '../../lib/canvasParser'
import type { ParserEvent } from '../../lib/canvasParser'
```

`parseCanvasBlocks` is kept because the non-streaming fallback path (Task 6) still uses it.

- [ ] **Add refs** near the other `useRef` declarations in the component body. Search for existing refs (e.g. `messagesEndRef`, `abortRef`) and add after them:

```typescript
const canvasParserRef = useRef<StreamingCanvasParser | null>(null)
const canvasChatBufferRef = useRef<string>('')
```

- [ ] **Reset parser before streaming starts.** Find the line `if (streamingEnabled) {` (around line 1321) and add just before `const handle = streamChat(`:

```typescript
canvasParserRef.current = new StreamingCanvasParser()
canvasChatBufferRef.current = ''
```

- [ ] **Replace the chunk callback** (the `(chunk) => { ... }` lambda, lines ~1326–1357). Replace the entire lambda body with:

```typescript
(chunk) => {
  const chat = useStore.getState().chats.find((c) => c.id === activeChatId)
  if (!chat) return

  const existingMsg = chat.messages.find((m) => m.id === assistantMsg.id)
  const currentRaw = existingMsg?.rawContent || existingMsg?.content || ''
  const accumulatedRaw = currentRaw + chunk

  // Feed chunk through canvas parser
  const parser = canvasParserRef.current!
  const events = parser.feed(chunk)

  for (const event of events) {
    if (event.type === 'chatChunk') {
      canvasChatBufferRef.current += event.text
    } else if (event.type === 'canvasStart') {
      const currentCanvas = useStore.getState().chats.find(c => c.id === activeChatId)?.canvasDocuments ?? []
      const existingIdx = currentCanvas.findIndex(d => d.title === event.title)
      const newDoc = { id: event.id, title: event.title, lang: event.lang, content: '', updatedAt: Date.now(), isStreaming: true }
      const mergedDocs = existingIdx >= 0
        ? currentCanvas.map((d, i) => i === existingIdx ? { ...newDoc, id: d.id } : d)
        : [...currentCanvas, newDoc]
      updateChat(activeChatId, { canvasDocuments: mergedDocs, activeCanvasId: event.id })
    } else if (event.type === 'canvasChunk') {
      const currentCanvas = useStore.getState().chats.find(c => c.id === activeChatId)?.canvasDocuments ?? []
      updateChat(activeChatId, {
        canvasDocuments: currentCanvas.map(d =>
          d.id === event.id ? { ...d, content: d.content + event.text } : d
        ),
      })
    } else if (event.type === 'canvasEnd') {
      const currentCanvas = useStore.getState().chats.find(c => c.id === activeChatId)?.canvasDocuments ?? []
      updateChat(activeChatId, {
        canvasDocuments: currentCanvas.map(d =>
          d.id === event.id ? { ...d, isStreaming: false, updatedAt: Date.now() } : d
        ),
      })
    }
  }

  // Determine display content (canvas-stripped, tool-fence-aware)
  const chatContent = canvasChatBufferRef.current
  const hasToolFence = /```tool_calls?\b/.test(accumulatedRaw)
  const isSubtool = hasToolFence && /"subtool"\s*:/.test(accumulatedRaw)
  const displayContent = hasToolFence
    ? (isSubtool ? '' : commentaryBeforeFence(chatContent))
    : chatContent

  updateChat(activeChatId, {
    messages: chat.messages.map((m) =>
      m.id === assistantMsg.id
        ? { ...m, content: displayContent, rawContent: accumulatedRaw }
        : m,
    ),
  })
},
```

- [ ] **Add `finalize()` call** in the completion callback (the `() => { ... }` lambda). Find the opening of the completion callback (around line 1359) and add as the very first line after entering the callback:

```typescript
// Finalize canvas parser — flushes any buffered content
if (canvasParserRef.current) {
  const finalEvents = canvasParserRef.current.finalize()
  for (const event of finalEvents) {
    if (event.type === 'chatChunk') {
      canvasChatBufferRef.current += event.text
    } else if (event.type === 'canvasChunk') {
      const currentCanvas = useStore.getState().chats.find(c => c.id === activeChatId)?.canvasDocuments ?? []
      updateChat(activeChatId, {
        canvasDocuments: currentCanvas.map(d =>
          d.id === event.id ? { ...d, content: d.content + event.text } : d
        ),
      })
    } else if (event.type === 'canvasEnd') {
      const currentCanvas = useStore.getState().chats.find(c => c.id === activeChatId)?.canvasDocuments ?? []
      updateChat(activeChatId, {
        canvasDocuments: currentCanvas.map(d =>
          d.id === event.id ? { ...d, isStreaming: false, updatedAt: Date.now() } : d
        ),
      })
    }
  }
  canvasParserRef.current = null
}
```

- [ ] **Build check**

```bash
cd /Users/arnavsaini/Byte && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Commit**

```bash
git add src/components/views/ChatView.tsx
git commit -m "feat(canvas): wire StreamingCanvasParser into ChatView streaming loop"
```

---

## Task 6: Remove post-completion canvas parsing from ChatView

**Files:**
- Modify: `src/components/views/ChatView.tsx`

Canvas is now fully handled during streaming. The post-completion canvas parsing calls added in earlier attempts must be removed to avoid double-processing.

- [ ] **Find and remove** all calls to `parseCanvasBlocks` in `ChatView.tsx`. There should be multiple occurrences (in the streaming completion callback's tool branches, and in the non-streaming path). Search:

```bash
grep -n "parseCanvasBlocks\|mergedDocs\|currentCanvas" /Users/arnavsaini/Byte/src/components/views/ChatView.tsx
```

- [ ] **In the streaming completion callback**, in the `hasAnyTool` branch and the else branch, remove the canvas-merge logic. The message should simply be updated with `displayContent` (already in `canvasChatBufferRef.current` after finalize). The completion path should NOT call `parseCanvasBlocks`. The tool branches update message content using `extractToolCommentary` — those extracted strings are chat-side only and contain no canvas fences (canvas fences were already stripped during streaming). Leave tool handling as-is; just remove canvas merge code.

For the `if (!hasAnyTool)` branch (around the old lines 1407–1422), replace the entire block with:

```typescript
if (!hasAnyTool) {
  const finalChatContent = canvasChatBufferRef.current.replace(/\n$/, '')
  updateChat(activeChatId, {
    messages: chat.messages.map((m) =>
      m.id === assistantMsg.id
        ? { ...m, content: finalChatContent, status: 'done' as const }
        : m,
    ),
  })
}
```

For the `else` (tool) branch that previously called `parseCanvasBlocks`, remove the canvas-parsing portion entirely and just update the message with `displayContent`:

```typescript
} else {
  updateChat(activeChatId, {
    messages: chat.messages.map((m) =>
      m.id === assistantMsg.id
        ? { ...m, content: displayContent, rawContent: rawResponse }
        : m,
    ),
  })
}
```

- [ ] **In the non-streaming path** (`else if (!streamingEnabled)` around line 1500+), `parseCanvasBlocks` should still be called since there is no streaming loop. Leave that usage intact — it is the one-shot synchronous parse path.

- [ ] **Build check**

```bash
cd /Users/arnavsaini/Byte && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Commit**

```bash
git add src/components/views/ChatView.tsx
git commit -m "refactor(canvas): remove post-completion canvas parsing from streaming path"
```

---

## Task 7: Update `CANVAS.md` prompt — remove canvas-link

**Files:**
- Modify: `prompts/tools/CANVAS.md`

The `<canvas-link>` token system is removed. The inline preview card now appears automatically at the position of the canvas fence. The AI no longer needs to append `<canvas-link>` lines.

- [ ] **Rewrite** `prompts/tools/CANVAS.md`:

```markdown
# Canvas Documents

Produce large documents or code files as Canvas artifacts — they open in a side panel for comfortable reading, separate from the chat.

## When to use canvas

Use `document` or `codefile` fences when the content is:
- A complete file or module (even if short, if it stands alone as a file)
- A prose document, essay, report, or structured reference the user will want to read or reuse
- Code longer than ~40 lines, or any code that functions as a complete artifact rather than an illustration

Use a regular ` ``` ` code fence for short snippets (<~40 lines) that illustrate a point inline.

Use a `render` fence for interactive React/HTML content (charts, calculators, simulations).

## Format

For prose documents:
` ``document title="Document Title"
# Heading

Your content here...
` ``

For code files:
` ``codefile title="filename.tsx" lang="tsx"
export function MyComponent() {
  ...
}
` ``

Supported `lang` values: any language identifier (tsx, ts, py, md, json, sql, sh, etc.)

## Multiple documents

You may produce multiple canvas documents in one message. Each gets its own fence block.

## Updates

If you produce a document with the same title as a previous one, it replaces the previous version in the canvas panel.
```

- [ ] **Commit**

```bash
git add prompts/tools/CANVAS.md
git commit -m "docs(canvas): remove canvas-link from AI prompt instructions"
```

---

## Task 8: Final build check and smoke test

- [ ] **Full TypeScript check**

```bash
cd /Users/arnavsaini/Byte && npx tsc --noEmit 2>&1
```

Expected: zero errors (or only pre-existing errors unchanged from before this work).

- [ ] **Dev server smoke test**

```bash
cd /Users/arnavsaini/Byte && npm run dev
```

Open the app, start a new chat, send: `make a short markdown document about coffee`. Verify:
1. Canvas panel slides open before the response completes
2. Text streams into the panel live
3. Preview card in chat shows "Writing..." while streaming
4. On completion: card shows "Document · MD" + Open button; panel shows rendered markdown
5. Copy button works after completion

- [ ] **Commit any final fixes**

```bash
git add -A
git commit -m "fix(canvas): post-smoke-test corrections"
```
