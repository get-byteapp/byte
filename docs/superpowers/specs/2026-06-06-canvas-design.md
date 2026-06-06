# Canvas Feature Design

**Date:** 2026-06-06  
**Status:** Draft

---

## Overview

Canvas is a side panel that shows large documents and code files the AI produces — analogous to ChatGPT Canvas. Small interactive content already uses the existing `render` fence (iframe via `ArtifactFrame`). Canvas is for plain text documents and code files that are too large or too document-like for an inline block.

The AI decides which mode to use based on prompt instructions. The frontend routes accordingly.

---

## AI Output Format

### New fenced block types

The AI wraps canvas content in two new fence types:

````
```document title="My Essay"
# Introduction
...
```
````

````
```codefile title="App.tsx" lang="tsx"
export function App() { ... }
```
````

**Existing behavior unchanged:**
- ` ```render ` → `ArtifactFrame` (inline iframe, React/HTML)
- ` ```<language> ` → `CodeBlock` (syntax-highlighted, copyable)
- `<details><summary>` → collapsible dropdown (existing)

### Canvas link marker

After any message that creates or updates one or more canvas documents, the AI appends one line per document:

```
<canvas-link title="My Essay" />
```

This renders as a clickable **"Open Document: My Essay →"** pill at the bottom of the message bubble.

---

## Prompt Instruction (new file: `prompts/tools/CANVAS.md`)

Instructs the AI:
- Use `document` fence for prose, markdown, essays, reports, structured notes — anything meant to be read as a document
- Use `codefile` fence for complete files, multi-function modules, anything >~40 lines of code
- Use regular ` ``` ` code fences for short snippets (<~40 lines) that illustrate a point inline
- Use `render` for interactive React/HTML content
- After producing a `document` or `codefile` block, always append `<canvas-link title="..." />` on its own line
- Multiple documents in one response: one `<canvas-link />` per document

---

## Inline Collapsed Preview

When `markdown.tsx` encounters a `document` or `codefile` fence, it does **not** pass it to `CodeBlock` or `ArtifactFrame`. Instead it:

1. Extracts the content and `title` / `lang` attributes from the fence
2. Stores the document in chat canvas state (see State section)
3. Renders an **inline collapsed preview** in the message bubble — same `<details>` pattern already used for web search results:
   - Summary row: file icon + title + language badge
   - Body: syntax-highlighted content, **max-height ~5 lines**, `overflow-y: scroll`
   - This preview is read-only and always collapsed by default

4. `<canvas-link title="..." />` tags render as an **"Open Document: {title} →"** pill below the message text

The collapsed preview and the open pill are separate UI elements. The preview shows the raw content inline; the pill opens the full side panel.

---

## Canvas Side Panel (`CanvasPanel.tsx`)

Slides in from the right edge of `ChatView`, splitting the view ~50/50. Animated slide-in (200ms `ease-out`).

### Layout

```
┌─────────────────┬──────────────────────┐
│   Chat messages │  [Tab1] [Tab2] [×]   │
│                 │─────────────────────│
│                 │  Document content   │
│                 │  (syntax highlight  │
│                 │   or rendered md)   │
│   Input box     │                     │
└─────────────────┴──────────────────────┘
```

- Tabs along the top: one per open document, clicking switches active document
- Each tab shows the document title, truncated if needed
- `×` button closes the panel (sets `activeCanvasId: null`)
- Content area: syntax-highlighted code (via `CodeBlock` in read-only mode) or rendered markdown (`MarkdownContent`)
- No editing in v1

### Design

Follows Byte's existing CSS variable system. Panel background `var(--sf)`, border-left `1px solid var(--bd)`. Tabs use `var(--sf2)` inactive, `var(--bg)` active. Slide animation: `transform: translateX(100%)` → `translateX(0)` over 200ms `cubic-bezier(0.23, 1, 0.32, 1)`.

---

## State

Two new fields added to the `Chat` interface in `src/types/index.ts`:

```ts
canvasDocuments?: CanvasDocument[]
activeCanvasId?: string | null
```

New type:

```ts
export interface CanvasDocument {
  id: string       // nanoid
  title: string
  lang: string     // "markdown", "tsx", "python", etc.
  content: string
  updatedAt: number
}
```

`canvasDocuments` is optional so existing `Chat` objects without it are valid (no migration needed).

Store actions in `useStore.ts`:
- `upsertCanvasDocument(chatId, doc)` — add or update by title match
- `setActiveCanvasId(chatId, id | null)`

---

## Parser (`src/lib/canvasParser.ts`)

A preprocessing step that runs on the AI's streamed text **before** `MarkdownRenderer` sees it.

Steps:
1. Scan for ` ```document ` and ` ```codefile ` fences using regex
2. For each match: extract `title`, `lang`, `content`
3. Call `upsertCanvasDocument` to store in state
4. Replace the fence in the text with a placeholder `CANVAS_PREVIEW_{id}` token
5. `<canvas-link title="..." />` tags are replaced with `CANVAS_LINK_{title}` placeholder tokens — `MarkdownRenderer` splits on these and renders the open pill component, same pattern as `DETAIL_N`

`MarkdownRenderer` splits on `CANVAS_PREVIEW_{id}` tokens (same pattern as existing `DETAIL_N` tokens) and renders the inline collapsed preview component in their place.

---

## Files Changed / Created

| File | Change |
|------|--------|
| `src/types/index.ts` | Add `CanvasDocument` type; add optional fields to `Chat` |
| `src/store/useStore.ts` | Add `upsertCanvasDocument`, `setActiveCanvasId` actions |
| `src/lib/canvasParser.ts` | **New** — fence extraction, placeholder injection |
| `src/lib/markdown.tsx` | Handle `CANVAS_PREVIEW_*` tokens; handle `<canvas-link>` tags; add `document`/`codefile` fence routes |
| `src/components/shared/CanvasPreview.tsx` | **New** — inline collapsed preview component |
| `src/components/shared/CanvasPanel.tsx` | **New** — side panel with tabs |
| `src/components/views/ChatView.tsx` | Wrap layout in flex row; render `CanvasPanel` when `activeCanvasId` is set; pass canvas state |
| `prompts/tools/CANVAS.md` | **New** — AI instructions for when/how to use canvas fences |

---

## Streaming Behavior

The parser runs incrementally on the streamed content. Fence extraction only fires once the closing ` ``` ` token arrives (fence is complete). Until then the content inside the fence is buffered and not shown. After extraction the placeholder is injected and the preview renders.

This means during streaming the user sees the prose parts of the message in real time, and the canvas preview appears once the fence closes — same UX as how `ArtifactFrame` renders after the closing fence.

---

## What's Out of Scope (v1)

- Editing canvas documents from the panel
- Asking the AI to update a specific canvas document by name
- Exporting canvas documents
- Canvas documents persisting across chats
