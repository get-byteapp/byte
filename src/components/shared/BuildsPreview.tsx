interface BuildsPreviewProps {
  title: string
  lang: string
  onOpen: () => void
  isStreaming?: boolean
}

function DocIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
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
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M5 2.5A1.5 1.5 0 0 1 6.5 1h5.379a1.5 1.5 0 0 1 1.06.44l2.622 2.621A1.5 1.5 0 0 1 16 5.12V17.5A1.5 1.5 0 0 1 14.5 19h-8A1.5 1.5 0 0 1 5 17.5v-15Z" fill="var(--sf3)" stroke="var(--bd2)" strokeWidth="1"/>
      <path d="M11.5 1v3.5a.5.5 0 0 0 .5.5H15.5" stroke="var(--bd2)" strokeWidth="1" strokeLinecap="round"/>
      <path d="M7.5 10.5 L9 12 L7.5 13.5" stroke="var(--acc)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
      <line x1="10.5" y1="14" x2="12.5" y2="9" stroke="var(--tx3)" strokeWidth="1" strokeLinecap="round"/>
    </svg>
  )
}

export function BuildsPreview({ title, lang, onOpen, isStreaming }: BuildsPreviewProps) {
  const isMarkdown = lang === 'markdown' || lang === 'md'
  const isHtml = lang === 'html'
  const typeLabel = isMarkdown ? 'Document' : isHtml ? 'Website' : 'Code'
  const langLabel = isMarkdown ? 'MD' : lang.toUpperCase()

  return (
    <>
      <style>{`
        @keyframes builds-writing-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        .builds-writing-dot {
          animation: builds-writing-pulse 1.2s ease-in-out infinite;
          display: inline-block;
        }
        .builds-writing-dot:nth-child(2) { animation-delay: 0.2s; }
        .builds-writing-dot:nth-child(3) { animation-delay: 0.4s; }
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
          ;(e.currentTarget as HTMLDivElement).style.borderColor = 'var(--bd2)'
          ;(e.currentTarget as HTMLDivElement).style.background = 'var(--sf2)'
        }}
        onMouseLeave={isStreaming ? undefined : e => {
          ;(e.currentTarget as HTMLDivElement).style.borderColor = 'var(--bd)'
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
                <span className="builds-writing-dot">.</span>
                <span className="builds-writing-dot">.</span>
                <span className="builds-writing-dot">.</span>
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
