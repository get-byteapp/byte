# Canvas Redesign Spec
**Date:** 2026-06-06

## Goal
Rewrite the canvas feature from scratch so it:
1. Reliably parses canvas blocks in all response paths (with or without tools)
2. Streams content into the panel in real-time — panel opens the moment the fence is detected
3. Looks clean and matches the chat aesthetic

---

## Architecture

### StreamingCanvasParser

A stateful class in `src/lib/canvasParser.ts` that replaces `parseCanvasBlocks`. It is fed one chunk at a time during streaming and emits typed events.

**States:** `normal` | `in-canvas`

**Logic:**
- Buffers incoming characters into a line buffer until `\n`
- In `normal` mode: when a complete line matches `` ```document title="..." `` or `` ```codefile title="..." lang="..." ``, emit `canvasStart` and switch to `in-canvas`. Also emit a `CANVAS_PREVIEW_{id}` token into chat output so the inline card appears.
- In `in-canvas` mode: flush content directly to the canvas content buffer on each chunk (no waiting for newline). When a line is exactly `` ``` ``, emit `canvasEnd` and switch back to `normal`.
- All other content in `normal` mode is flushed to chat output.

**Events:**
```ts
type ParserEvent =
  | { type: 'chatChunk'; text: string }
  | { type: 'canvasStart'; id: string; title: string; lang: string }
  | { type: 'canvasChunk'; id: string; text: string }
  | { type: 'canvasEnd'; id: string }
```

**Also exports:** `parseCanvasBlocks(content: string)` — one-shot version for rehydrating stored messages that already have `CANVAS_PREVIEW_` tokens baked in (used when loading chats from store).

---

## Data Flow

### During streaming

```
AI chunk arrives
  → StreamingCanvasParser.feed(chunk) → [ParserEvent, ...]
  → canvasStart  : create CanvasDocument { isStreaming: true } in chat.canvasDocuments
                   open panel, set activeCanvasId
  → canvasChunk  : append text to document.content in store
  → canvasEnd    : set document.isStreaming = false, trigger markdown render
  → chatChunk    : append to streaming chat content (existing path)
```

Panel opens immediately on `canvasStart` — before any content arrives.

### After streaming (tool paths)

The existing `hasAnyTool` branching is irrelevant — canvas parsing now happens chunk-by-chunk during streaming, not in a post-completion step. The tool detection code runs on the complete response as before, but canvas documents are already extracted.

For non-streaming path (rare fallback): run a synchronous pass of `StreamingCanvasParser` over the full response string, same parser, just fed all at once.

---

## Components

### CanvasPanel

- **New prop:** `isStreaming?: boolean`
- When `isStreaming`:
  - Render content as plain preformatted text (no markdown parsing)
  - Show a blinking `|` cursor at end of content via CSS animation
  - "Copy" button is disabled (grayed out)
- When streaming ends: switch to `MarkdownRenderer` / `CodeBlock` rendering
- Slide-in animation triggers when panel first mounts (unchanged)
- Panel layout: alongside chat (chat flex-shrinks, panel takes right portion)

### CanvasPreview (inline card)

- Renders in chat at the `CANVAS_PREVIEW_{id}` token position
- While `isStreaming`:
  - Subtitle shows animated "Writing..." instead of "Document · MD"
  - "Open" button is replaced with a dimmed placeholder
- On completion: shows normal subtitle + Open button
- Clicking the card (anywhere) opens the panel

### CanvasDocument type

```ts
interface CanvasDocument {
  id: string
  title: string
  lang: string
  content: string
  updatedAt: number
  isStreaming?: boolean   // NEW
}
```

---

## What Gets Deleted / Cleaned Up

- `parseCanvasBlocks` as a post-completion call in ChatView streaming handler
- The `hasAnyTool` canvas-skip bug (both streaming and non-streaming paths)
- The duplicate canvas merge logic scattered across tool branches
- The `CANVAS_LINK_` / `<canvas-link>` token system — removed entirely (unnecessary complexity; the inline card is sufficient)
- The `encodeTitle` / `decodeTitle` exports (no longer needed without CANVAS_LINK)

---

## Rendering During Streaming

Plain text during streaming, rendered markdown/code on `canvasEnd`. This avoids markdown re-parse flicker on every chunk. The transition is instant and unnoticed in practice since streaming ends before the user has time to interact.

---

## Edge Cases

- **Fence split across chunks** (e.g. `` ` `` arrives, then `` ``document ``): the line buffer handles this — we only process a line when `\n` arrives, so split fences are assembled correctly.
- **Multiple canvas blocks in one response**: each gets its own id, tab in the panel. Active tab switches to newest on `canvasStart`.
- **Canvas block with no closing fence** (truncated response): on stream end, `finalize()` is called — if still in `in-canvas` mode, emit `canvasEnd` for the open document with whatever content arrived.
- **Tool responses that also contain canvas**: no special handling needed — parser runs on every chunk regardless.

---

## Files Changed

| File | Change |
|------|--------|
| `src/lib/canvasParser.ts` | Full rewrite — StreamingCanvasParser class + one-shot parseCanvasBlocks |
| `src/components/views/ChatView.tsx` | Feed chunks to parser, handle events, remove post-completion canvas parsing |
| `src/components/shared/CanvasPanel.tsx` | Add isStreaming prop, plain-text streaming mode, cursor animation |
| `src/components/shared/CanvasPreview.tsx` | Add isStreaming state, animated "Writing..." subtitle |
| `src/types/index.ts` | Add isStreaming to CanvasDocument |
| `prompts/tools/CANVAS.md` | Remove CANVAS_LINK documentation |
