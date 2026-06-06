// src/components/shared/CanvasPanel.tsx
import { MarkdownRenderer } from '../../lib/markdown'
import { CodeBlock } from './CodeBlock'
import type { CanvasDocument } from '../../types'

interface CanvasPanelProps {
  documents: CanvasDocument[]
  activeId: string
  onSetActive: (id: string) => void
  onClose: () => void
}

export function CanvasPanel({ documents, activeId, onSetActive, onClose }: CanvasPanelProps) {
  const active = documents.find(d => d.id === activeId) ?? documents[0]
  if (!active) return null

  const isMarkdown = active.lang === 'markdown' || active.lang === 'md'

  return (
    <div
      style={{
        width: '50%',
        minWidth: 320,
        maxWidth: 720,
        display: 'flex',
        flexDirection: 'column',
        borderLeft: '1px solid var(--bd)',
        background: 'var(--sf)',
        animation: 'canvasSlideIn 200ms cubic-bezier(0.23, 1, 0.32, 1) both',
        overflow: 'hidden',
        flexShrink: 0,
      }}
    >
      <style>{`
        @keyframes canvasSlideIn {
          from { transform: translateX(100%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
      `}</style>

      {/* Tab bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          borderBottom: '1px solid var(--bd)',
          background: 'var(--sf2)',
          overflowX: 'auto',
          flexShrink: 0,
        }}
      >
        {documents.map(doc => (
          <button
            key={doc.id}
            onClick={() => onSetActive(doc.id)}
            style={{
              padding: '8px 14px',
              background: doc.id === activeId ? 'var(--sf)' : 'none',
              border: 'none',
              borderBottom: doc.id === activeId ? '2px solid var(--acc)' : '2px solid transparent',
              color: doc.id === activeId ? 'var(--tx)' : 'var(--tx3)',
              cursor: 'pointer',
              fontFamily: 'var(--font)',
              fontSize: 'var(--fs)',
              whiteSpace: 'nowrap',
              maxWidth: 180,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              transition: 'color 140ms ease-out, border-bottom-color 140ms ease-out',
            }}
            title={doc.title}
          >
            {doc.title}
          </button>
        ))}

        {/* Close button — pushed to the right */}
        <button
          onClick={onClose}
          style={{
            marginLeft: 'auto',
            padding: '8px 12px',
            background: 'none',
            border: 'none',
            color: 'var(--tx3)',
            cursor: 'pointer',
            fontSize: 16,
            lineHeight: 1,
            flexShrink: 0,
            transition: 'color 140ms ease-out',
          }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--tx)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--tx3)')}
          title="Close canvas"
        >
          ✕
        </button>
      </div>

      {/* Content area */}
      <div style={{ flex: 1, overflow: 'auto', padding: '16px' }}>
        {isMarkdown ? (
          <MarkdownRenderer content={active.content} />
        ) : (
          <CodeBlock language={active.lang} code={active.content} noRun />
        )}
      </div>
    </div>
  )
}
