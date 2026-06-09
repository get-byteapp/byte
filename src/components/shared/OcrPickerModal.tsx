import { useState, useEffect } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { getOfflineEngines, getApiEngines, getRecommendedEngineId } from '../../lib/ocrEngines'
import { preloadTesseract, preloadPaddleOCR } from '../../lib/ocr'
import type { OcrEngineId, SystemSpecs } from '../../types'
import { useStore } from '../../store/useStore'

interface OcrPickerModalProps {
  onClose: () => void
}

export function OcrPickerModal({ onClose }: OcrPickerModalProps) {
  const { activeOcrEngineId, setActiveOcrEngineId, ocrApiConfigs, setOcrApiConfig, removeOcrApiConfig, installedOfflineEngines, addInstalledOfflineEngine, removeInstalledOfflineEngine } = useStore()
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

  const handleInstallEngine = async (id: string) => {
    setInstallingId(id)
    try {
      let ok = false
      if (id === 'tesseract') ok = await preloadTesseract()
      else if (id === 'paddleocr') ok = await preloadPaddleOCR()
      if (ok) {
        addInstalledOfflineEngine(id)
        setActiveOcrEngineId(id)
      }
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

  const handleRemoveOfflineEngine = (id: string) => {
    removeInstalledOfflineEngine(id)
  }

  const offlineEngines = getOfflineEngines()
  const apiEngines = getApiEngines()

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '16px',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{
        width: '100%', maxWidth: 520, maxHeight: '85vh',
        background: 'var(--sf)', border: '1px solid var(--bd)',
        borderRadius: 'var(--r-lg)', overflow: 'hidden',
        display: 'flex', flexDirection: 'column',
        boxShadow: '0 20px 80px rgba(0,0,0,0.25)',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '20px 24px', borderBottom: '1px solid var(--bd)',
          flexShrink: 0,
        }}>
          <div style={{ flex: 1 }}>
            <h2 style={{
              margin: 0, fontSize: 16, fontWeight: 600,
              color: 'var(--tx)', lineHeight: 1.3,
            }}>Choose OCR Engine</h2>
            <p style={{
              margin: '4px 0 0 0', fontSize: 12, color: 'var(--tx3)',
            }}>Select an offline or API-based engine for text recognition</p>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 32, height: 32, borderRadius: 'var(--r-sm)',
              border: 'none', background: 'var(--sf2)',
              color: 'var(--tx3)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 140ms ease', flexShrink: 0,
              padding: 0,
            }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M2 2l12 12M14 2L2 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div style={{
          display: 'flex', gap: 0,
          padding: '0', borderBottom: '1px solid var(--bd)', flexShrink: 0,
          background: 'var(--sf2)',
        }}>
          {(['offline', 'api'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                flex: 1, padding: '12px 16px', fontSize: 13, fontWeight: 500,
                background: 'none', border: 'none', cursor: 'pointer',
                color: tab === t ? 'var(--tx)' : 'var(--tx3)',
                borderBottom: tab === t ? '2px solid var(--acc)' : '2px solid transparent',
                marginBottom: tab === t ? -1 : 0,
                transition: 'color 140ms ease, border-color 140ms ease',
                position: 'relative',
              }}
            >
              {t === 'offline' ? 'Offline Engines' : 'API Services'}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflow: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {tab === 'offline' && offlineEngines.map(engine => {
            const isActive = activeOcrEngineId === engine.id
            const isInstalled = installedOfflineEngines.includes(engine.id)
            const isRecommended = recommendedId === engine.id

            return (
              <div
                key={engine.id}
                style={{
                  padding: '16px', borderRadius: 'var(--r-md)',
                  border: `1px solid ${isActive ? 'var(--acc)' : 'var(--bd)'}`,
                  background: isActive ? 'var(--acc-soft)' : 'var(--sf)',
                  display: 'flex', flexDirection: 'column', gap: 12,
                  transition: 'all 140ms ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--tx)' }}>{engine.name}</span>
                      {isRecommended && (
                        <span style={{
                          fontSize: 11, fontWeight: 600, padding: '3px 8px',
                          background: 'var(--ocr-color)', color: '#fff', borderRadius: '4px',
                          whiteSpace: 'nowrap',
                        }}>Recommended</span>
                      )}
                    </div>
                    <p style={{ margin: '0 0 8px 0', fontSize: 12, color: 'var(--tx2)', lineHeight: 1.4 }}>
                      {engine.description}
                    </p>
                    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <span style={{ fontSize: 10, color: 'var(--tx3)' }}>Storage</span>
                        <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--tx)' }}>~{engine.storageMb} MB</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <span style={{ fontSize: 10, color: 'var(--tx3)' }}>RAM Required</span>
                        <span style={{
                          fontSize: 12, fontWeight: 500,
                          color: specs && engine.minRamGb <= specs.totalRamGb ? 'var(--tx)' : 'var(--danger)',
                        }}>
                          {engine.minRamGb}GB minimum
                        </span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <span style={{ fontSize: 10, color: 'var(--tx3)' }}>Quality</span>
                        <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--tx)' }}>{engine.quality}/5</span>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    {isInstalled ? (
                      <>
                        <button
                          onClick={() => handleToggleEngine(engine.id)}
                          style={{
                            padding: '8px 14px', borderRadius: 'var(--r-sm)',
                            border: `1px solid ${isActive ? 'var(--acc)' : 'var(--bd)'}`,
                            background: isActive ? 'var(--acc)' : 'var(--sf2)',
                            color: isActive ? '#fff' : 'var(--tx)',
                            fontSize: 12, fontWeight: 500, cursor: 'pointer',
                            whiteSpace: 'nowrap', transition: 'all 140ms ease',
                          }}
                        >
                          {isActive ? 'Active' : 'Activate'}
                        </button>
                        <button
                          onClick={() => handleRemoveOfflineEngine(engine.id)}
                          title="Delete this engine"
                          style={{
                            width: 32, height: 32, padding: 0, borderRadius: 'var(--r-sm)',
                            border: '1px solid var(--bd)',
                            background: 'none', color: 'var(--tx3)',
                            cursor: 'pointer',
                            transition: 'all 140ms ease',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}
                        >
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                            <path d="M2 4h12M6.5 7v4M9.5 7v4M3 4l0.5 10a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1L13 4M6 4V3a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => handleInstallEngine(engine.id)}
                        disabled={installingId === engine.id}
                        style={{
                          padding: '8px 14px', borderRadius: 'var(--r-sm)',
                          border: '1px solid var(--acc)',
                          background: 'var(--acc)', color: '#fff',
                          fontSize: 12, fontWeight: 500, cursor: installingId === engine.id ? 'default' : 'pointer',
                          whiteSpace: 'nowrap', transition: 'all 140ms ease',
                          opacity: installingId === engine.id ? 0.7 : 1,
                        }}
                      >
                        {installingId === engine.id ? 'Downloading…' : 'Download'}
                      </button>
                    )}
                  </div>
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
                  padding: '16px', borderRadius: 'var(--r-md)',
                  border: `1px solid ${isActive ? 'var(--acc)' : 'var(--bd)'}`,
                  background: isActive ? 'var(--acc-soft)' : 'var(--sf)',
                  display: 'flex', flexDirection: 'column', gap: 12,
                  transition: 'all 140ms ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3 style={{ margin: '0 0 4px 0', fontSize: 14, fontWeight: 600, color: 'var(--tx)' }}>
                      {engine.name}
                    </h3>
                    <p style={{ margin: '0 0 8px 0', fontSize: 12, color: 'var(--tx2)', lineHeight: 1.4 }}>
                      {engine.description}
                    </p>
                    <div style={{ display: 'flex', gap: 16 }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <span style={{ fontSize: 10, color: 'var(--tx3)' }}>Type</span>
                        <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--tx)' }}>Cloud API</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <span style={{ fontSize: 10, color: 'var(--tx3)' }}>Quality</span>
                        <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--tx)' }}>{engine.quality}/5</span>
                      </div>
                    </div>
                  </div>

                  {isConfigured && (
                    <button
                      onClick={() => handleToggleEngine(engine.id)}
                      style={{
                        padding: '8px 14px', borderRadius: 'var(--r-sm)',
                        border: `1px solid ${isActive ? 'var(--acc)' : 'var(--bd)'}`,
                        background: isActive ? 'var(--acc)' : 'var(--sf2)',
                        color: isActive ? '#fff' : 'var(--tx)',
                        fontSize: 12, fontWeight: 500, cursor: 'pointer',
                        whiteSpace: 'nowrap', flexShrink: 0, transition: 'all 140ms ease',
                      }}
                    >
                      {isActive ? 'Active' : 'Activate'}
                    </button>
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'stretch' }}>
                    <input
                      type="password"
                      placeholder={engine.apiKeyPlaceholder ?? 'API Key'}
                      value={inputVal.apiKey}
                      onChange={e => setApiKeyInputs(prev => ({
                        ...prev,
                        [engine.id]: { ...prev[engine.id] ?? { apiKey: '', endpoint: '' }, apiKey: e.target.value }
                      }))}
                      style={{
                        flex: 1, padding: '9px 12px', fontSize: 12,
                        background: 'var(--sf2)', border: '1px solid var(--bd)',
                        borderRadius: 'var(--r-sm)', color: 'var(--tx)',
                        fontFamily: 'var(--font)',
                        outline: 'none', transition: 'all 140ms ease',
                      }}
                    />
                    <button
                      onClick={() => handleSaveApiKey(engine.id)}
                      disabled={!inputVal.apiKey}
                      style={{
                        padding: '9px 16px', borderRadius: 'var(--r-sm)',
                        border: '1px solid var(--acc)',
                        background: inputVal.apiKey ? 'var(--acc)' : 'var(--sf2)',
                        color: inputVal.apiKey ? '#fff' : 'var(--tx3)',
                        fontSize: 12, fontWeight: 500, cursor: inputVal.apiKey ? 'pointer' : 'not-allowed',
                        whiteSpace: 'nowrap', transition: 'all 140ms ease',
                        opacity: inputVal.apiKey ? 1 : 0.6,
                      }}
                    >
                      {savingId === engine.id ? 'Saved ✓' : 'Save'}
                    </button>
                    {isConfigured && (
                      <button
                        onClick={() => handleRemoveApiKey(engine.id)}
                        title="Delete this API key"
                        style={{
                          width: 32, height: 32, padding: 0, borderRadius: 'var(--r-sm)',
                          border: '1px solid var(--bd)',
                          background: 'none', color: 'var(--tx3)',
                          cursor: 'pointer',
                          transition: 'all 140ms ease',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}
                      >
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                          <path d="M2 4h12M6.5 7v4M9.5 7v4M3 4l0.5 10a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1L13 4M6 4V3a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
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
                        padding: '9px 12px', fontSize: 12,
                        background: 'var(--sf2)', border: '1px solid var(--bd)',
                        borderRadius: 'var(--r-sm)', color: 'var(--tx)',
                        outline: 'none', transition: 'all 140ms ease',
                      }}
                    />
                  )}

                  {engine.apiKeyLink && (
                    <a
                      href={engine.apiKeyLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        fontSize: 11, color: 'var(--acc)', textDecoration: 'none',
                        fontWeight: 500, transition: 'color 140ms ease',
                      }}
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
