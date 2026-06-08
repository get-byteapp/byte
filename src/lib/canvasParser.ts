import type { BuildsDocument } from '../types'

export type ParserEvent =
  | { type: 'chatChunk'; text: string }
  | { type: 'canvasStart'; id: string; title: string; lang: string }
  | { type: 'canvasChunk'; id: string; text: string }
  | { type: 'canvasEnd'; id: string }

// Matches any ```<keyword> ... line — we filter on title= presence to distinguish builds from normal fences
const OPEN_FENCE_RE = /^```([\w-]+)\s+(.+)$/
const CANVAS_LINK_RE = /^<canvas-link\s+title="[^"]+"\s*\/?>/

function parseAttrs(type: string, attrStr: string): { title: string; lang: string } | null {
  const titleMatch = /title="([^"]+)"/.exec(attrStr)
  if (!titleMatch) return null  // no title= means it's a normal code fence, not a build
  const langMatch = /lang="([^"]+)"/.exec(attrStr)
  const title = titleMatch[1]
  let lang: string
  if (type === 'document') {
    lang = langMatch?.[1] ?? 'markdown'
  } else if (type === 'codefile') {
    lang = langMatch?.[1] ?? 'text'
  } else {
    // type is the language itself e.g. ```html title="..." or ```tsx title="..."
    lang = langMatch?.[1] ?? type
  }
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
      const attrs = parseAttrs(type, attrStr)
      if (attrs) {
        const { title, lang } = attrs
        const existingId = this.seenTitles.get(title)
        const id = existingId ?? crypto.randomUUID()
        this.seenTitles.set(title, id)
        this.currentDocId = id
        this.mode = 'in-canvas'
        events.push({ type: 'canvasStart', id, title, lang })
        events.push({ type: 'chatChunk', text: `CANVAS_PREVIEW_${id}\n` })
        return events
      }
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
export function parseCanvasBlocks(raw: string): { content: string; documents: BuildsDocument[] } {
  const parser = new StreamingCanvasParser()
  const events = [...parser.feed(raw), ...parser.finalize()]

  let content = ''
  const documents: BuildsDocument[] = []

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
