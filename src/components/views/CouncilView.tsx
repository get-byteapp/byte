export function CouncilView() {
  return (
    <div className="view on">
      <div className="council-stage">
        <h1 className="vi-h" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <span style={{
            width: 22, height: 22, borderRadius: 6,
            background: 'var(--sf2)', border: '1px solid var(--bd)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--tx2)',
          }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 21h10"/><rect width="20" height="14" x="2" y="3" rx="2"/></svg>
          </span>
          Council
        </h1>
        <p className="vi-sub">Ask multiple AI models at once</p>
        <div className="council-slots">
          <div className="c-slot">
            <span className="c-slot-icon">+</span>
            <span className="c-slot-name">Add Model</span>
          </div>
        </div>
        <div className="council-modes">
          <button className="c-mode on">Sequential</button>
          <button className="c-mode">Parallel</button>
          <button className="c-mode">Debate</button>
        </div>
      </div>
    </div>
  )
}