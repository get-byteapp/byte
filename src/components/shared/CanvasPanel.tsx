import { useState } from 'react'
import { MarkdownRenderer } from '../../lib/markdown'
import { CodeBlock } from './CodeBlock'
import type { CanvasDocument } from '../../types'

interface CanvasPanelProps {
  documents: CanvasDocument[]
  activeId: string
  onSetActive: (id: string) => void
  onClose: () => void
}

function CopyIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <rect x="4.5" y="4.5" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.2"/>
      <path d="M2.5 9.5H2A1.5 1.5 0 0 1 .5 8V2A1.5 1.5 0 0 1 2 .5h6A1.5 1.5 0 0 1 9.5 2v.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  )
}

export function CanvasPanel({ documents, activeId, onSetActive, onClose }: CanvasPanelProps) {
  const [copied, setCopied] = useState(false)
  const active = documents.find(d => d.id === activeId) ?? documents[0]
  if (!active) return null

  const isMarkdown = active.lang === 'markdown' || active.lang === 'md'

  function handleCopy() {
    navigator.clipboard.writeText(active.content).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    })
  }

  return (
    <div
      style={{
        width: '46%',
        minWidth: 340,
        maxWidth: 700,
        display: 'flex',
        flexDirection: 'column',
        borderLeft: '1px solid var(--bd)',
        background: 'var(--sf)',
        animation: 'canvasSlideIn 220ms cubic-bezier(0.23, 1, 0.32, 1) both',
        overflow: 'hidden',
        flexShrink: 0,
      }}
    >
      <style>{`
        @keyframes canvasSlideIn {
          from { transform: translateX(40px); opacity: 0; }
          to   { transform: translateX(0); opacity: 1; }
        }
        @media (prefers-reduced-motion: reduce) {
          @keyframes canvasSlideIn {
            from { opacity: 0; }
            to   { opacity: 1; }
          }
        }
        .canvas-panel-content .msg-txt p { margin: 0 0 1em; }
        .canvas-panel-content .msg-txt p:last-child { margin-bottom: 0; }
        .canvas-panel-content .msg-txt ol,
        .canvas-panel-content .msg-txt ul { margin: 0 0 1em; padding-left: 1.5em; }
        .canvas-panel-content .msg-txt li { margin: 0.25em 0; }
        .canvas-panel-content .msg-txt h1,
        .canvas-panel-content .msg-txt h2,
        .canvas-panel-content .msg-txt h3,
        .canvas-panel-content .msg-txt h4 { margin: 1.25em 0 0.5em; font-weight: 600; line-height: 1.3; }
        .canvas-panel-content .msg-txt h1 { font-size: 1.5em; }
        .canvas-panel-content .msg-txt h2 { font-size: 1.3em; border-bottom: 1px solid var(--bd); padding-bottom: 0.35em; }
        .canvas-panel-content .msg-txt h3 { font-size: 1.15em; }
        .canvas-panel-content .msg-txt blockquote { margin: 1em 0; padding-left: 1em; border-left: 3px solid var(--bd2); color: var(--tx2); }
        .canvas-panel-content .msg-txt hr { margin: 1.5em 0; border: none; border-top: 1px solid var(--bd); }
        .canvas-panel-content .msg-txt table { border-collapse: collapse; margin: 1em 0; width: 100%; }
        .canvas-panel-content .msg-txt th,
        .canvas-panel-content .msg-txt td { border: 1px solid var(--bd); padding: 8px 12px; text-align: left; }
        .canvas-panel-content .msg-txt th { background: var(--sf2); font-weight: 600; }
        .canvas-panel-content .msg-txt a { color: var(--acc); text-decoration: underline; }
        .canvas-panel-content .msg-txt code:not(pre code) { background: var(--code-bg); padding: 2px 5px; border-radius: 4px; font-size: 0.9em; }
        .canvas-panel-content .msg-txt strong { font-weight: 600; }
        .canvas-panel-content .msg-txt em { font-style: italic; }
      `}</style>

      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '0 4px 0 16px',
          height: 46,
          borderBottom: '1px solid var(--bd)',
          background: 'var(--sf)',
          flexShrink: 0,
        }}
      >
        {/* Tabs */}
        <div style={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: 0, overflowX: 'auto', gap: 2 }}>
          {documents.map(doc => {
            const isActive = doc.id === activeId
            return (
              <button
                key={doc.id}
                onClick={() => onSetActive(doc.id)}
                style={{
                  padding: '5px 10px',
                  background: isActive ? 'var(--sf2)' : 'none',
                  border: '1px solid',
                  borderColor: isActive ? 'var(--bd)' : 'transparent',
                  borderRadius: 'var(--r-sm)',
                  color: isActive ? 'var(--tx)' : 'var(--tx3)',
                  cursor: 'pointer',
                  fontFamily: 'var(--font)',
                  fontSize: 12,
                  whiteSpace: 'nowrap',
                  maxWidth: 180,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  transition: 'all 140ms ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
                title={doc.title}
              >
                <span>{doc.title}</span>
                <span
                  style={{
                    fontSize: 10,
                    padding: '1px 5px',
                    borderRadius: 3,
                    background: 'var(--acc-soft)',
                    color: 'var(--acc)',
                    fontFamily: 'var(--font)',
                    letterSpacing: '0.04em',
                  }}
                >
                  {(doc.lang === 'markdown' || doc.lang === 'md') ? 'MD' : doc.lang.toUpperCase()}
                </span>
              </button>
            )
          })}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
          <button
            onClick={handleCopy}
            title="Copy content"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              padding: '5px 10px',
              borderRadius: 'var(--r-sm)',
              border: '1px solid var(--bd)',
              background: copied ? 'var(--acc-soft)' : 'var(--sf2)',
              color: copied ? 'var(--acc)' : 'var(--tx2)',
              cursor: 'pointer',
              fontSize: 11,
              fontFamily: 'var(--font)',
              transition: 'all 140ms ease',
              whiteSpace: 'nowrap',
            }}
            onMouseEnter={e => {
              if (!copied) {
                e.currentTarget.style.background = 'var(--sf3)'
                e.currentTarget.style.borderColor = 'var(--bd2)'
              }
            }}
            onMouseLeave={e => {
              if (!copied) {
                e.currentTarget.style.background = 'var(--sf2)'
                e.currentTarget.style.borderColor = 'var(--bd)'
              }
            }}
          >
            <CopyIcon />
            {copied ? 'Copied' : 'Copy'}
          </button>

          <button
            onClick={onClose}
            title="Close"
            style={{
              width: 30,
              height: 30,
              borderRadius: 'var(--r-sm)',
              border: '1px solid transparent',
              background: 'none',
              color: 'var(--tx3)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 140ms ease',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'var(--sf2)'
              e.currentTarget.style.borderColor = 'var(--bd)'
              e.currentTarget.style.color = 'var(--tx)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'none'
              e.currentTarget.style.borderColor = 'transparent'
              e.currentTarget.style.color = 'var(--tx3)'
            }}
          >
            <CloseIcon />
          </button>
        </div>
      </div>

      {/* Content */}
      <div
        className="canvas-panel-content"
        style={{ flex: 1, overflow: 'auto', padding: '24px 28px' }}
      >
        {isMarkdown ? (
          <div
            className="msg-txt"
            style={{
              fontSize: 'calc(var(--fs) + 0.5px)',
              color: 'var(--tx)',
              lineHeight: 1.75,
            }}
          >
            <MarkdownRenderer content={active.content} />
          </div>
        ) : (
          <CodeBlock language={active.lang} code={active.content} noRun />
        )}
      </div>
    </div>
  )
}
