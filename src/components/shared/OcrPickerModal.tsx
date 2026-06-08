import { useState, useEffect } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { getOfflineEngines, getApiEngines, getRecommendedEngineId } from '../../lib/ocrEngines'
import type { OcrEngineId, SystemSpecs } from '../../types'
import { useStore } from '../../store/useStore'

interface OcrPickerModalProps {
  onClose: () => void
}

export function OcrPickerModal({ onClose }: OcrPickerModalProps) {
  const { activeOcrEngineId, setActiveOcrEngineId, ocrApiConfigs, setOcrApiConfig, removeOcrApiConfig } = useStore()
  const [tab, setTab] = useState<'offline' | 'api'>('offline')
  const [specs, setSpecs] = useState<SystemSpecs | null>(null)
  const [recommendedId, setRecommendedId] = useState<OcrEngineId | null>(null)
  const [installingId, setInstallingId] = useState<string | null>(null)
  const [apiKeyInputs, setApiKeyInputs] = useState<Record<string, { apiKey: string; endpoint: string }>>({})
  const [savingId, setSavingId] = useState<string | null>(null)

  useEffect(() => {
    invoke<SystemSpecs>('get_system_specs').then(s => {
      setSpecs(s)
      setRecommendedId(getRecommendedEngineId(s))
    }).catch(() => {})

    const inputs: Record<string, { apiKey: string; endpoint: string }> = {}
    for (const [id, cfg] of Object.entries(ocrApiConfigs)) {
      inputs[id] = { apiKey: cfg.apiKey, endpoint: cfg.endpoint ?? '' }
    }
    setApiKeyInputs(inputs)
  }, [])

  const handleInstallTesseract = async () => {
    setInstallingId('tesseract')
    try {
      const { preloadTesseract } = await import('../../lib/ocr')
      const ok = await preloadTesseract()
      if (ok) setActiveOcrEngineId('tesseract')
    } finally {
      setInstallingId(null)
    }
  }

  const handleToggleEngine = (id: string) => {
    setActiveOcrEngineId(activeOcrEngineId === id ? null : id)
  }

  const handleSaveApiKey = (id: string) => {
    setSavingId(id)
    const input = apiKeyInputs[id]
    if (input?.apiKey) {
      setOcrApiConfig(id, { apiKey: input.apiKey, endpoint: input.endpoint || undefined })
      if (activeOcrEngineId !== id) setActiveOcrEngineId(id)
    }
    setTimeout(() => setSavingId(null), 800)
  }

  const handleRemoveApiKey = (id: string) => {
    removeOcrApiConfig(id)
    if (activeOcrEngineId === id) setActiveOcrEngineId(null)
  }

  const offlineEngines = getOfflineEngines()
  const apiEngines = getApiEngines()

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{
        width: 520, maxHeight: '80vh',
        background: 'var(--bg)', border: '1px solid var(--bd)',
        borderRadius: 'var(--r)', overflow: 'hidden',
        display: 'flex', flexDirection: 'column',
        boxShadow: '0 24px 64px rgba(0,0,0,0.4)',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '16px 20px', borderBottom: '1px solid var(--bd)',
          flexShrink: 0,
        }}>
          <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--tx)', flex: 1 }}>OCR Engine</span>
          <button
            onClick={onClose}
            style={{
              width: 28, height: 28, borderRadius: 'var(--r-sm)',
              border: '1px solid transparent', background: 'none',
              color: 'var(--tx3)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div style={{
          display: 'flex', padding: '0 20px',
          borderBottom: '1px solid var(--bd)', flexShrink: 0,
        }}>
          {(['offline', 'api'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                padding: '10px 16px', fontSize: 13, fontWeight: 500,
                background: 'none', border: 'none', cursor: 'pointer',
                color: tab === t ? 'var(--tx)' : 'var(--tx3)',
                borderBottom: tab === t ? '2px solid var(--acc)' : '2px solid transparent',
                marginBottom: -1, transition: 'all 140ms ease',
              }}
            >
              {t === 'offline' ? 'Offline' : 'API'}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflow: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {tab === 'offline' && offlineEngines.map(engine => {
            const isActive = activeOcrEngineId === engine.id
            const isInstalled = engine.id === 'tesseract'
            const isRecommended = recommendedId === engine.id

            return (
              <div
                key={engine.id}
                style={{
                  padding: '14px 16px', borderRadius: 'var(--r-sm)',
                  border: `1px solid ${isActive ? 'var(--acc)' : 'var(--bd)'}`,
                  background: isActive ? 'var(--acc-soft, var(--sf2))' : 'var(--sf2)',
                  display: 'flex', flexDirection: 'column', gap: 10,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--tx)' }}>{engine.name}</span>
                      {isRecommended && (
                        <span style={{
                          fontSize: 10, fontWeight: 600, padding: '2px 6px',
                          background: 'var(--acc)', color: '#fff', borderRadius: 99,
                        }}>Recommended</span>
                      )}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--tx2)', marginBottom: 4 }}>{engine.description}</div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <span style={{ fontSize: 11, color: 'var(--tx3)' }}>~{engine.storageMb} MB</span>
                      {specs && (
                        <span style={{ fontSize: 11, color: engine.minRamGb <= specs.totalRamGb ? 'var(--tx3)' : 'var(--err, red)' }}>
                          {engine.minRamGb}GB RAM min
                        </span>
                      )}
                      <span style={{ fontSize: 11, color: 'var(--tx3)' }}>{'⭐'.repeat(engine.quality)}</span>
                    </div>
                  </div>

                  {isInstalled ? (
                    <button
                      onClick={() => handleToggleEngine(engine.id)}
                      style={{
                        padding: '6px 14px', borderRadius: 'var(--r-sm)',
                        border: `1px solid ${isActive ? 'var(--acc)' : 'var(--bd)'}`,
                        background: isActive ? 'var(--acc)' : 'var(--sf)',
                        color: isActive ? '#fff' : 'var(--tx2)',
                        fontSize: 12, fontWeight: 500, cursor: 'pointer',
                        whiteSpace: 'nowrap', flexShrink: 0,
                      }}
                    >
                      {isActive ? 'Active' : 'Use'}
                    </button>
                  ) : (
                    <button
                      onClick={handleInstallTesseract}
                      disabled={installingId === engine.id}
                      style={{
                        padding: '6px 14px', borderRadius: 'var(--r-sm)',
                        border: '1px solid var(--bd)',
                        background: 'var(--sf)', color: 'var(--tx2)',
                        fontSize: 12, fontWeight: 500, cursor: 'pointer',
                        whiteSpace: 'nowrap', flexShrink: 0,
                      }}
                    >
                      {installingId === engine.id ? 'Loading…' : 'Download'}
                    </button>
                  )}
                </div>
              </div>
            )
          })}

          {tab === 'api' && apiEngines.map(engine => {
            const isActive = activeOcrEngineId === engine.id
            const savedConfig = ocrApiConfigs[engine.id]
            const isConfigured = !!savedConfig?.apiKey
            const inputVal = apiKeyInputs[engine.id] ?? { apiKey: '', endpoint: '' }

            return (
              <div
                key={engine.id}
                style={{
                  padding: '14px 16px', borderRadius: 'var(--r-sm)',
                  border: `1px solid ${isActive ? 'var(--acc)' : 'var(--bd)'}`,
                  background: isActive ? 'var(--acc-soft, var(--sf2))' : 'var(--sf2)',
                  display: 'flex', flexDirection: 'column', gap: 10,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--tx)', marginBottom: 3 }}>{engine.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--tx2)', marginBottom: 4 }}>{engine.description}</div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <span style={{ fontSize: 11, color: 'var(--tx3)' }}>API</span>
                      <span style={{ fontSize: 11, color: 'var(--tx3)' }}>{'⭐'.repeat(engine.quality)}</span>
                    </div>
                  </div>

                  {isConfigured && (
                    <button
                      onClick={() => handleToggleEngine(engine.id)}
                      style={{
                        padding: '6px 14px', borderRadius: 'var(--r-sm)',
                        border: `1px solid ${isActive ? 'var(--acc)' : 'var(--bd)'}`,
                        background: isActive ? 'var(--acc)' : 'var(--sf)',
                        color: isActive ? '#fff' : 'var(--tx2)',
                        fontSize: 12, fontWeight: 500, cursor: 'pointer',
                        whiteSpace: 'nowrap', flexShrink: 0,
                      }}
                    >
                      {isActive ? 'Active' : 'Use'}
                    </button>
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <input
                      type="password"
                      placeholder={engine.apiKeyPlaceholder ?? 'API Key'}
                      value={inputVal.apiKey}
                      onChange={e => setApiKeyInputs(prev => ({
                        ...prev,
                        [engine.id]: { ...prev[engine.id] ?? { apiKey: '', endpoint: '' }, apiKey: e.target.value }
                      }))}
                      style={{
                        flex: 1, padding: '7px 10px', fontSize: 12,
                        background: 'var(--sf)', border: '1px solid var(--bd)',
                        borderRadius: 'var(--r-sm)', color: 'var(--tx)',
                        fontFamily: 'var(--font-mono, monospace)',
                      }}
                    />
                    <button
                      onClick={() => handleSaveApiKey(engine.id)}
                      disabled={!inputVal.apiKey}
                      style={{
                        padding: '7px 12px', borderRadius: 'var(--r-sm)',
                        border: '1px solid var(--bd)',
                        background: 'var(--sf)', color: 'var(--tx2)',
                        fontSize: 12, fontWeight: 500, cursor: 'pointer',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {savingId === engine.id ? 'Saved ✓' : 'Save'}
                    </button>
                    {isConfigured && (
                      <button
                        onClick={() => handleRemoveApiKey(engine.id)}
                        style={{
                          padding: '7px 10px', borderRadius: 'var(--r-sm)',
                          border: '1px solid var(--bd)',
                          background: 'none', color: 'var(--tx3)',
                          fontSize: 12, cursor: 'pointer',
                        }}
                      >
                        Remove
                      </button>
                    )}
                  </div>

                  {engine.endpointLabel && (
                    <input
                      type="text"
                      placeholder="https://your-resource.cognitiveservices.azure.com/"
                      value={inputVal.endpoint}
                      onChange={e => setApiKeyInputs(prev => ({
                        ...prev,
                        [engine.id]: { ...prev[engine.id] ?? { apiKey: '', endpoint: '' }, endpoint: e.target.value }
                      }))}
                      style={{
                        padding: '7px 10px', fontSize: 12,
                        background: 'var(--sf)', border: '1px solid var(--bd)',
                        borderRadius: 'var(--r-sm)', color: 'var(--tx)',
                      }}
                    />
                  )}

                  {engine.apiKeyLink && (
                    <a
                      href={engine.apiKeyLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ fontSize: 11, color: 'var(--acc)', textDecoration: 'none' }}
                    >
                      Get API key →
                    </a>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
