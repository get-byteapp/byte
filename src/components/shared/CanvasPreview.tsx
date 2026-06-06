// src/components/shared/CanvasPreview.tsx
import { useState } from 'react'
import { CodeBlock } from './CodeBlock'

interface CanvasPreviewProps {
  title: string
  lang: string
  content: string
  onOpen: () => void
}

export function CanvasPreview({ title, lang, content }: CanvasPreviewProps) {
  const [expanded, setExpanded] = useState(false)

  const isMarkdown = lang === 'markdown' || lang === 'md'

  return (
    <div
      style={{
        border: '1px solid var(--bd)',
        borderRadius: 'var(--r)',
        overflow: 'hidden',
        margin: '6px 0',
        background: 'var(--sf)',
      }}
    >
      {/* Header row */}
      <button
        onClick={() => setExpanded(e => !e)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          width: '100%',
          padding: '8px 12px',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: 'var(--tx)',
          fontFamily: 'var(--font)',
          fontSize: 'var(--fs)',
          textAlign: 'left',
          transition: 'background 140ms ease-out',
        }}
        onMouseEnter={e => (e.currentTarget.style.background = 'var(--sf2)')}
        onMouseLeave={e => (e.currentTarget.style.background = 'none')}
      >
        <span style={{ fontSize: 13 }}>{isMarkdown ? '📄' : '📝'}</span>
        <span style={{ fontWeight: 500, flex: 1 }}>{title}</span>
        {lang !== 'markdown' && (
          <span
            style={{
              fontSize: 11,
              padding: '2px 6px',
              borderRadius: 'var(--r-sm)',
              background: 'var(--acc-soft)',
              color: 'var(--acc)',
              fontFamily: 'monospace',
            }}
          >
            {lang}
          </span>
        )}
        <span style={{ color: 'var(--tx3)', fontSize: 12 }}>
          {expanded ? '▲' : '▼'}
        </span>
      </button>

      {/* Preview body — max 5 lines, scrollable */}
      {expanded && (
        <div
          style={{
            maxHeight: '7.5em', // ~5 lines at 1.5em line-height
            overflowY: 'auto',
            borderTop: '1px solid var(--bd)',
          }}
        >
          <CodeBlock language={isMarkdown ? 'markdown' : lang} code={content} noRun />
        </div>
      )}
    </div>
  )
}
