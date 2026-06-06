// src/lib/canvasParser.ts
import type { CanvasDocument } from '../types'

export interface CanvasParseResult {
  content: string
  documents: CanvasDocument[]
}

const FENCE_RE = /```(document|codefile)(.*?)\n([\s\S]*?)```/g
const LINK_RE = /<canvas-link\s+title="([^"]+)"\s*\/?>/g

function parseAttrs(attrStr: string): { title: string; lang: string } {
  const titleMatch = /title="([^"]+)"/.exec(attrStr)
  const langMatch = /lang="([^"]+)"/.exec(attrStr)
  const title = titleMatch ? titleMatch[1] : 'Untitled'
  const lang = langMatch ? langMatch[1] : 'markdown'
  return { title, lang }
}

export function parseCanvasBlocks(content: string): CanvasParseResult {
  const documents: CanvasDocument[] = []
  const seenTitles = new Map<string, string>() // title → id

  let cleaned = content.replace(FENCE_RE, (_match, type, attrStr, body) => {
    const { title, lang } = parseAttrs(attrStr.trim())
    const resolvedLang = type === 'document' ? (lang || 'markdown') : (lang || 'text')

    // Reuse id if we've seen this title before (update semantics)
    const existingId = seenTitles.get(title)
    const id = existingId ?? crypto.randomUUID()
    seenTitles.set(title, id)

    documents.push({
      id,
      title,
      lang: resolvedLang,
      content: body.trimEnd(),
      updatedAt: Date.now(),
    })

    return `CANVAS_PREVIEW_${id}`
  })

  // Replace <canvas-link title="..."> with CANVAS_LINK_{title_encoded} placeholder
  cleaned = cleaned.replace(LINK_RE, (_match, title) => {
    return `CANVAS_LINK_${encodeTitle(title)}`
  })

  return { content: cleaned, documents }
}

export function encodeTitle(title: string): string {
  return title.replace(/[^a-zA-Z0-9_-]/g, '_')
}

export function decodeTitle(encoded: string): string {
  // We store the original title separately; this is only used as a lookup key
  return encoded
}
