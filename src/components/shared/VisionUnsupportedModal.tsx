interface VisionUnsupportedModalProps {
  modelName: string
  onGoToSettings: () => void
  onCancel: () => void
}

export function VisionUnsupportedModal({ modelName, onGoToSettings, onCancel }: VisionUnsupportedModalProps) {
  return (
    <div
      className="modal-overlay"
      onClick={e => { if (e.target === e.currentTarget) onCancel() }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: 380,
          background: 'var(--sf)',
          border: '1px solid var(--bd2)',
          borderRadius: 'var(--r-lg)',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
          boxShadow: '0 16px 48px rgba(0,0,0,0.35)',
          animation: 'up .14s ease',
        }}
      >
        <div style={{
          width: 40, height: 40, borderRadius: 'var(--r)',
          background: 'var(--sf2)', border: '1px solid var(--bd)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <circle cx="10" cy="10" r="2.5" stroke="var(--tx3)" strokeWidth="1.5"/>
            <path d="M10 17C5.5 17 2.5 13.5 2 10c.5-3.5 3-7 8-7s7.5 3.5 8 7c-.5 3.5-3 7-8 7Z" stroke="var(--tx3)" strokeWidth="1.5" fill="none"/>
            <line x1="2" y1="2" x2="18" y2="18" stroke="var(--tx3)" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </div>

        <div>
          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--tx)', marginBottom: 6 }}>
            Vision not supported
          </div>
          <div style={{ fontSize: 13, color: 'var(--tx3)', lineHeight: 1.5 }}>
            <strong style={{ color: 'var(--tx)' }}>{modelName}</strong> doesn't support image input.
            Switch to a vision-capable model in Settings to use this image.
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button
            onClick={onCancel}
            style={{
              padding: '8px 16px', borderRadius: 'var(--r)',
              border: '1px solid var(--bd)', background: 'none',
              color: 'var(--tx2)', fontSize: 13, fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={onGoToSettings}
            style={{
              padding: '8px 16px', borderRadius: 'var(--r)',
              border: '1px solid var(--acc)',
              background: 'var(--acc)', color: '#fff',
              fontSize: 13, fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Go to Settings
          </button>
        </div>
      </div>
    </div>
  )
}
