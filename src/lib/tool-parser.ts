export type ParsedToolCall =
  | {
      kind: 'tool'
      tool: string
      input: Record<string, unknown>
      commentary: string
      raw: string
    }
  | {
      kind: 'subtool'
      subtool: string
      input: Record<string, unknown>
      commentary: string
      raw: string
    }

export type ParseToolCallsResult = {
  toolCalls: ParsedToolCall[]
  cleanedText: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

function toParsedToolCall(
  obj: Record<string, unknown>,
  commentary: string,
  raw: string,
): ParsedToolCall | null {
  const tool = obj.tool
  if (typeof tool === 'string' && tool.trim()) {
    const { tool: _tool, ...rest } = obj
    return {
      kind: 'tool',
      tool,
      input: rest,
      commentary,
      raw,
    }
  }

  const subtool = obj.subtool
  if (typeof subtool === 'string' && subtool.trim()) {
    const { subtool: _subtool, ...rest } = obj
    return {
      kind: 'subtool',
      subtool,
      input: rest,
      commentary,
      raw,
    }
  }

  return null
}

function normalizeCleanedText(text: string): string {
  const trimmed = text.trim()
  // Removing blocks can create excessive vertical whitespace; keep prose intact otherwise.
  return trimmed.replace(/\n{3,}/g, '\n\n')
}

/**
 * Parses fenced code blocks tagged exactly `tool_call` (single JSON object)
 * and `tool_calls` (JSON array).
 */
export function parseToolCallsFromText(input: string): ParseToolCallsResult {
  const toolCalls: ParsedToolCall[] = []
  const removeRanges: Array<{ start: number; end: number }> = []

  // Matches blocks like:
  // ```tool_call\n{...}\n```
  // ```tool_calls\n[{...}, {...}]\n```
  const fenceRe =
    /^[ \t]*(`{3,})(tool_call|tool_calls)[ \t]*\r?\n([\s\S]*?)\r?\n[ \t]*\1[ \t]*(?=\r?\n|$)/gm

  let lastRecognizedEnd = 0
  let match: RegExpExecArray | null
  // eslint-disable-next-line no-cond-assign
  while ((match = fenceRe.exec(input))) {
    const raw = match[0]
    const tag = match[2] as 'tool_call' | 'tool_calls'
    const jsonText = match[3]?.trim() ?? ''
    const start = match.index
    const end = start + raw.length

    let parsed: unknown
    try {
      parsed = JSON.parse(jsonText)
    } catch {
      continue
    }

    const commentary = input.slice(lastRecognizedEnd, start).trim()

    const blockCalls: ParsedToolCall[] = []
    if (tag === 'tool_call') {
      if (isRecord(parsed)) {
        const call = toParsedToolCall(parsed, commentary, raw)
        if (call) blockCalls.push(call)
      }
    } else {
      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          if (!isRecord(item)) continue
          const call = toParsedToolCall(item, commentary, raw)
          if (call) blockCalls.push(call)
        }
      }
    }

    // Ignore blocks that don't produce any valid tool calls.
    if (blockCalls.length === 0) continue

    toolCalls.push(...blockCalls)
    removeRanges.push({ start, end })
    lastRecognizedEnd = end
  }

  let cleanedText = input
  if (removeRanges.length > 0) {
    let out = ''
    let cursor = 0
    for (const { start, end } of removeRanges) {
      out += cleanedText.slice(cursor, start)
      cursor = end
    }
    out += cleanedText.slice(cursor)
    cleanedText = normalizeCleanedText(out)
  } else {
    cleanedText = normalizeCleanedText(cleanedText)
  }

  return { toolCalls, cleanedText }
}
