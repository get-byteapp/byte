import { useState } from 'react'
import { MarkdownRenderer } from '../../lib/markdown'
import { CodeBlock } from './CodeBlock'
import { ArtifactFrame } from './ArtifactFrame'
import type { BuildsDocument } from '../../types'

interface BuildsPanelProps {
  documents: BuildsDocument[]
  activeId: string | null
  onSetActive: (id: string) => void
  onClose: () => void
  onSidebarStateChange?: (state: 'full' | 'icons' | 'none') => void
  currentSidebarState?: 'full' | 'icons' | 'none'
}

function ChevronLeftIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M10 13L4 8l6-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function EyeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="2.5" stroke="currentColor" strokeWidth="1.2"/>
      <path d="M8 13C4 13 1.5 10 1 8c.5-2 2.5-5 7-5s6.5 3 7 5c-.5 2-3 5-7 5Z" stroke="currentColor" strokeWidth="1.2" fill="none"/>
    </svg>
  )
}

function CodeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M5 12l-3-4 3-4M11 12l3-4-3-4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

type ViewMode = 'gallery' | 'single'
type DisplayMode = 'preview' | 'raw'

export function BuildsPanel({ documents, activeId, onSetActive, onClose, onSidebarStateChange, currentSidebarState }: BuildsPanelProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('single')
  const [displayMode, setDisplayMode] = useState<DisplayMode>('preview')
  const active = documents.find(d => d.id === activeId) ?? (documents.length > 0 ? documents[0] : null)
  const isStreaming = active?.isStreaming ?? false
  const isMarkdown = active?.lang === 'markdown' || active?.lang === 'md'
  const isHtml = active?.lang === 'html'

  const handleBack = () => {
    setViewMode('gallery')
    if (onSidebarStateChange && currentSidebarState === 'full') {
      onSidebarStateChange('icons')
    }
  }

  const handleGalleryClose = () => {
    onClose()
  }

  if (documents.length === 0) return null

  return (
    <div
      style={{
        width: viewMode === 'gallery' ? '23%' : '46%',
        minWidth: viewMode === 'gallery' ? 200 : 340,
        maxWidth: viewMode === 'gallery' ? 340 : 700,
        display: 'flex',
        flexDirection: 'column',
        borderLeft: '1px solid var(--bd)',
        background: 'var(--sf)',
        animation: 'buildsSlideIn 220ms cubic-bezier(0.23, 1, 0.32, 1) both',
        overflow: 'hidden',
        flexShrink: 0,
      }}
    >
      <style>{`
        @keyframes buildsSlideIn {
          from { transform: translateX(40px); opacity: 0; }
          to   { transform: translateX(0); opacity: 1; }
        }
        @media (prefers-reduced-motion: reduce) {
          @keyframes buildsSlideIn {
            from { opacity: 0; }
            to   { opacity: 1; }
          }
        }
        @keyframes builds-cursor-blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
        .builds-cursor {
          display: inline-block;
          width: 2px;
          height: 1.1em;
          background: var(--tx2);
          vertical-align: text-bottom;
          margin-left: 2px;
          animation: builds-cursor-blink 900ms step-end infinite;
        }
        @keyframes toggleGlow {
          0%, 100% {
            box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.4);
          }
          50% {
            box-shadow: 0 0 0 8px rgba(59, 130, 246, 0);
          }
        }
        @keyframes iconBounce {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.15); }
        }
        .toggle-button-active {
          animation: toggleGlow 2s ease-in-out infinite;
        }
        .toggle-button-active:hover {
          animation: none;
        }
        .builds-panel-content .msg-txt p { margin: 0 0 1em; }
        .builds-panel-content .msg-txt p:last-child { margin-bottom: 0; }
        .builds-panel-content .msg-txt ol,
        .builds-panel-content .msg-txt ul { margin: 0 0 1em; padding-left: 1.5em; }
        .builds-panel-content .msg-txt li { margin: 0.25em 0; }
        .builds-panel-content .msg-txt h1,
        .builds-panel-content .msg-txt h2,
        .builds-panel-content .msg-txt h3,
        .builds-panel-content .msg-txt h4 { margin: 1.25em 0 0.5em; font-weight: 600; line-height: 1.3; }
        .builds-panel-content .msg-txt h1 { font-size: 1.5em; }
        .builds-panel-content .msg-txt h2 { font-size: 1.3em; border-bottom: 1px solid var(--bd); padding-bottom: 0.35em; }
        .builds-panel-content .msg-txt h3 { font-size: 1.15em; }
        .builds-panel-content .msg-txt blockquote { margin: 1em 0; padding-left: 1em; border-left: 3px solid var(--bd2); color: var(--tx2); }
        .builds-panel-content .msg-txt hr { margin: 1.5em 0; border: none; border-top: 1px solid var(--bd); }
        .builds-panel-content .msg-txt table { border-collapse: collapse; margin: 1em 0; width: 100%; }
        .builds-panel-content .msg-txt th,
        .builds-panel-content .msg-txt td { border: 1px solid var(--bd); padding: 8px 12px; text-align: left; }
        .builds-panel-content .msg-txt th { background: var(--sf2); font-weight: 600; }
        .builds-panel-content .msg-txt a { color: var(--acc); text-decoration: underline; }
        .builds-panel-content .msg-txt code:not(pre code) { background: var(--code-bg); padding: 2px 5px; border-radius: 4px; font-size: 0.9em; }
        .builds-panel-content .msg-txt strong { font-weight: 600; }
        .builds-panel-content .msg-txt em { font-style: italic; }
      `}</style>

      {/* Gallery View */}
      {viewMode === 'gallery' ? (
        <>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '0 16px',
              height: 46,
              borderBottom: '1px solid var(--bd)',
              background: 'var(--sf)',
              flexShrink: 0,
            }}
          >
            <span style={{ color: 'var(--tx)', fontSize: 14, fontWeight: 500 }}>Builds</span>
            <div style={{ flex: 1 }} />
            <button
              onClick={handleGalleryClose}
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
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </button>
          </div>

          {/* Gallery Grid */}
          <div
            style={{
              flex: 1,
              overflow: 'auto',
              padding: '12px',
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
            }}
          >
            {documents.map(doc => {
              const docIsMarkdown = doc.lang === 'markdown' || doc.lang === 'md'
              return (
                <button
                  key={doc.id}
                  onClick={() => {
                    onSetActive(doc.id)
                    setViewMode('single')
                  }}
                  style={{
                    padding: '10px 14px',
                    borderRadius: 'var(--r-sm)',
                    border: '1px solid var(--bd)',
                    background: 'var(--sf2)',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 10,
                    textAlign: 'left',
                    transition: 'all 140ms ease',
                    width: '100%',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = 'var(--sf3)'
                    e.currentTarget.style.borderColor = 'var(--bd2)'
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = 'var(--sf2)'
                    e.currentTarget.style.borderColor = 'var(--bd)'
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--tx)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {doc.title}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--tx3)', marginTop: 2 }}>
                      {docIsMarkdown ? 'Document' : doc.lang === 'html' ? 'Website' : 'Code'} · {docIsMarkdown ? 'MD' : doc.lang.toUpperCase()}
                    </div>
                  </div>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ color: 'var(--tx3)', flexShrink: 0 }}>
                    <path d="M5 2l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              )
            })}
          </div>
        </>
      ) : (
        <>
          {/* Single Build Header - Row 1 */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '0 12px',
              height: 46,
              borderBottom: '1px solid var(--bd)',
              background: 'var(--sf)',
              flexShrink: 0,
            }}
          >
            <button
              onClick={handleBack}
              title="Back to builds"
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
              <ChevronLeftIcon />
            </button>

            {/* Title */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--tx)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {active?.title}
              </div>
            </div>

            {/* Close */}
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
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </button>
          </div>

          {/* Single Build Header - Row 2: Controls */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 12px',
              borderBottom: '1px solid var(--bd)',
              background: 'var(--sf)',
              flexShrink: 0,
            }}
          >
            {/* Toggle Preview/Raw */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 2, padding: '2px 4px', background: 'var(--sf2)', borderRadius: 'var(--r-sm)' }}>
              <button
                onClick={() => setDisplayMode('preview')}
                title="Preview"
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 'var(--r-sm)',
                  border: displayMode === 'preview' ? '1px solid var(--bd)' : '1px solid transparent',
                  background: displayMode === 'preview' ? 'var(--sf)' : 'none',
                  color: displayMode === 'preview' ? 'var(--tx)' : 'var(--tx3)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 200ms cubic-bezier(0.34, 1.56, 0.64, 1)',
                  boxShadow: displayMode === 'preview' ? '0 0 0 3px rgba(59, 130, 246, 0.1)' : 'none',
                }}
                onMouseEnter={e => {
                  if (displayMode !== 'preview') {
                    e.currentTarget.style.color = 'var(--tx2)'
                    e.currentTarget.style.transform = 'scale(1.1)'
                  }
                }}
                onMouseLeave={e => {
                  if (displayMode !== 'preview') {
                    e.currentTarget.style.color = 'var(--tx3)'
                    e.currentTarget.style.transform = 'scale(1)'
                  }
                }}
              >
                <EyeIcon />
              </button>
              <button
                onClick={() => setDisplayMode('raw')}
                title="Raw"
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 'var(--r-sm)',
                  border: displayMode === 'raw' ? '1px solid var(--bd)' : '1px solid transparent',
                  background: displayMode === 'raw' ? 'var(--sf)' : 'none',
                  color: displayMode === 'raw' ? 'var(--tx)' : 'var(--tx3)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 200ms cubic-bezier(0.34, 1.56, 0.64, 1)',
                  boxShadow: displayMode === 'raw' ? '0 0 0 3px rgba(59, 130, 246, 0.1)' : 'none',
                }}
                onMouseEnter={e => {
                  if (displayMode !== 'raw') {
                    e.currentTarget.style.color = 'var(--tx2)'
                    e.currentTarget.style.transform = 'scale(1.1)'
                  }
                }}
                onMouseLeave={e => {
                  if (displayMode !== 'raw') {
                    e.currentTarget.style.color = 'var(--tx3)'
                    e.currentTarget.style.transform = 'scale(1)'
                  }
                }}
              >
                <CodeIcon />
              </button>
            </div>

            {/* Copy button - only show in raw mode */}
            {displayMode === 'raw' && (
              <button
                onClick={() => {
                  navigator.clipboard.writeText(active?.content || '')
                }}
                title="Copy to clipboard"
                style={{
                  padding: '6px 12px',
                  borderRadius: 'var(--r-sm)',
                  border: '1px solid var(--bd2)',
                  background: 'var(--sf3)',
                  color: 'var(--tx2)',
                  fontSize: 12,
                  fontFamily: 'var(--font)',
                  cursor: 'pointer',
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
                Copy
              </button>
            )}

            <div style={{ flex: 1 }} />
          </div>

          {/* Content */}
          <div
            className="builds-panel-content"
            style={{ flex: 1, overflow: 'auto', padding: displayMode === 'preview' && isHtml ? 0 : '24px 28px' }}
          >
            {!active ? null : isStreaming ? (
              <pre style={{ margin: 0, fontFamily: 'var(--font-mono, monospace)', fontSize: 13, color: 'var(--tx)', whiteSpace: 'pre-wrap', wordBreak: 'break-word', lineHeight: 1.6 }}>
                {active.content}<span className="builds-cursor" />
              </pre>
            ) : displayMode === 'raw' || (!isMarkdown && !isHtml) ? (
              <pre style={{ margin: 0, fontFamily: 'var(--font-mono, monospace)', fontSize: 13, color: 'var(--tx)', whiteSpace: 'pre-wrap', wordBreak: 'break-word', lineHeight: 1.6, background: 'var(--sf2)', padding: 12, borderRadius: 'var(--r-sm)' }}>
                {active.content}
              </pre>
            ) : isMarkdown && displayMode === 'preview' ? (
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
            ) : isHtml && displayMode === 'preview' ? (
              <ArtifactFrame html={active.content} />
            ) : (
              <CodeBlock language={active.lang} code={active.content} noRun />
            )}
          </div>
        </>
      )}
    </div>
  )
}
