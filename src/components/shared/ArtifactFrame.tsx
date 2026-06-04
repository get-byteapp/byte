import { useState, useMemo, useEffect, useContext } from 'react'
import { StreamingContext } from '../../lib/markdown'

const SKELETON_STYLE = `@keyframes byte-skeleton{0%,100%{opacity:.35}50%{opacity:.7}}`

interface ArtifactFrameProps {
  html: string
}

function collectCssVars(): string {
  const s = getComputedStyle(document.body)
  const names = [
    '--bg','--sb','--sf','--sf2','--sf3',
    '--bd','--bd2','--bd3',
    '--tx','--tx2','--tx3','--tx4',
    '--acc','--acc-r','--acc-g','--acc-b',
    '--acc-hover','--acc-active','--acc-border','--acc-glow','--acc-soft',
    '--danger','--danger-bg','--danger-border','--danger-fill',
    '--warning','--success',
    '--code-bg','--msg-user-bg','--msg-user-border',
    '--r','--r-sm','--r-md','--r-lg',
    '--font','--font-d','--fs',
    '--pad-xs','--pad-sm','--pad-md','--pad-lg','--pad-xl',
    '--ease',
  ]
  return `:root{${names.map(n => `${n}:${s.getPropertyValue(n).trim()}`).join(';')}}`
}

// Resolved token values injected as window.BYTE — use these in Chart.js and canvas contexts
// where CSS var() doesn't work (Canvas API is not CSS-aware).
function buildByteScript(): string {
  const s = getComputedStyle(document.body)
  const g = (n: string) => s.getPropertyValue(n).trim()
  const tokens = {
    bg: g('--bg'), sf: g('--sf'), sf2: g('--sf2'), sf3: g('--sf3'),
    bd: g('--bd'), bd2: g('--bd2'),
    tx: g('--tx'), tx2: g('--tx2'), tx3: g('--tx3'), tx4: g('--tx4'),
    acc: g('--acc'), accSoft: g('--acc-soft'), accBorder: g('--acc-border'), accGlow: g('--acc-glow'), accHover: g('--acc-hover'),
    danger: g('--danger'), dangerBg: g('--danger-bg'), dangerFill: g('--danger-fill'),
    warning: g('--warning'), success: g('--success'),
    font: g('--font'), fontD: g('--font-d'), fs: g('--fs'),
    r: g('--r'), rSm: g('--r-sm'), rLg: g('--r-lg'),
  }
  return `<script>window.BYTE=${JSON.stringify(tokens)};window.BYTE.suggestPrompt=function(t){window.parent.dispatchEvent(new CustomEvent('byte-suggest-prompt',{detail:{prompt:t}}))} <\/script>`
}

// Component library injected into every artifact — gives the AI ready-to-use classes
const BASE_STYLES = `
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html{background:var(--bg)}
body{font-family:var(--font);font-size:var(--fs);color:var(--tx);background:var(--bg);line-height:1.6;padding:16px}
h1{font-family:var(--font);font-size:calc(var(--fs) + 6px);font-weight:600;color:var(--tx);margin-bottom:12px}
h2{font-family:var(--font);font-size:calc(var(--fs) + 3px);font-weight:600;color:var(--tx);margin-bottom:8px}
h3{font-size:calc(var(--fs) + 1px);font-weight:600;color:var(--tx);margin-bottom:6px}
p{color:var(--tx2);margin-bottom:8px}
small,.muted{color:var(--tx3);font-size:calc(var(--fs) - 1px)}
.accent{color:var(--acc)}.success{color:var(--success)}.danger{color:var(--danger)}.bold{font-weight:600}.center{text-align:center}
.mt{margin-top:12px}.mb{margin-bottom:12px}.mt-lg{margin-top:20px}.mb-lg{margin-bottom:20px}
.grid{display:grid;gap:10px}
.grid-2{grid-template-columns:repeat(2,1fr)}
.grid-3{grid-template-columns:repeat(3,1fr)}
@media(max-width:480px){.grid-2,.grid-3{grid-template-columns:1fr}}
.flex{display:flex;gap:8px;align-items:center}
.flex-col{display:flex;flex-direction:column;gap:8px}
.controls{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-bottom:12px}
.card{background:var(--sf2);border:1px solid var(--bd);border-radius:var(--r);padding:var(--pad-md)}
.stat{background:var(--sf2);border:1px solid var(--bd);border-radius:var(--r);padding:12px 16px}
.stat-label{font-size:calc(var(--fs) - 1px);color:var(--tx3);margin-bottom:4px}
.stat-value{font-size:calc(var(--fs) + 5px);font-weight:700;color:var(--tx);line-height:1.2}
.stat-sub{font-size:calc(var(--fs) - 1px);color:var(--tx3);margin-top:2px}
.btn{display:inline-flex;align-items:center;gap:6px;background:var(--sf2);border:1px solid var(--bd);color:var(--tx2);border-radius:var(--r-sm);padding:5px 12px;cursor:pointer;font-family:var(--font);font-size:var(--fs);transition:background 0.15s}
.btn:hover{background:var(--sf3)}
.btn-accent{background:var(--acc-soft);border-color:var(--acc-border);color:var(--acc)}
.btn-accent:hover{background:var(--acc-hover)}
input,select,textarea{background:var(--sf2);border:1px solid var(--bd);color:var(--tx);border-radius:var(--r-sm);padding:7px 10px;font-family:var(--font);font-size:var(--fs);outline:none;width:100%;transition:border-color 0.15s;min-height:32px}
input:focus,select:focus,textarea:focus{border-color:var(--acc-border)}
input[type=range]{accent-color:var(--acc);padding:0;border:none;background:none;height:20px;min-height:unset}
input[type=number]::-webkit-inner-spin-button,input[type=number]::-webkit-outer-spin-button{opacity:.5}
input[type=checkbox],input[type=radio]{width:auto;min-height:unset}
select{cursor:pointer}
label{font-size:calc(var(--fs) - 1px);color:var(--tx3);display:block;margin-bottom:4px}
.form-group{display:flex;flex-direction:column;gap:4px;margin-bottom:12px}
.form-group:last-child{margin-bottom:0}
.form-row{display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:10px}
@media(max-width:360px){.form-row{grid-template-columns:1fr}}
.input-group{display:flex;gap:6px;align-items:stretch}
.input-group input,.input-group select{flex:1}
.section-title{font-size:calc(var(--fs) - 1px);color:var(--tx3);letter-spacing:.07em;text-transform:uppercase;font-weight:500;margin-bottom:8px}
.result-box{background:var(--sf3);border:1px solid var(--bd2);border-radius:var(--r);padding:12px 16px;margin-top:4px}
.result-label{font-size:calc(var(--fs) - 1px);color:var(--tx3);margin-bottom:3px}
.result-value{font-size:calc(var(--fs) + 7px);font-weight:700;color:var(--tx);line-height:1.2}
table{width:100%;border-collapse:collapse;table-layout:auto}
.table-wrap{overflow-x:auto;border-radius:var(--r);border:1px solid var(--bd)}
.table-wrap table{margin:0}
th{text-align:left;color:var(--tx3);font-size:calc(var(--fs) - 1px);font-weight:500;padding:7px 10px;border-bottom:1px solid var(--bd);white-space:nowrap}
td{padding:8px 10px;border-bottom:1px solid var(--bd);color:var(--tx2);vertical-align:middle}
tr:last-child td{border-bottom:none}
tr:hover td{background:var(--sf3)}
.badge{display:inline-flex;align-items:center;background:var(--sf3);border:1px solid var(--bd);color:var(--tx2);border-radius:999px;padding:2px 8px;font-size:calc(var(--fs) - 2px)}
.badge-accent{background:var(--acc-soft);border-color:var(--acc-border);color:var(--acc)}
.badge-success{background:color-mix(in srgb,var(--success) 10%,transparent);color:var(--success);border-color:color-mix(in srgb,var(--success) 30%,transparent)}
.badge-danger{background:var(--danger-bg);color:var(--danger);border-color:var(--danger-border)}
hr{border:none;border-top:1px solid var(--bd);margin:12px 0}
`

const RESIZE_SCRIPT = `<script>(function(){
  function report(){parent.postMessage({type:'byte-artifact-h',h:document.documentElement.scrollHeight},'*')}
  if(document.readyState==='loading'){window.addEventListener('DOMContentLoaded',report)}else{report()}
  window.addEventListener('load',report)
  if(window.ResizeObserver){new ResizeObserver(report).observe(document.body)}
})()</script>`

const ERROR_SCRIPT = `<script>(function(){function r(m){parent.postMessage({type:'byte-artifact-error',message:String(m)},'*')}window.onerror=function(_,_2,_3,_4,e){r(e&&e.message||'Script error')};window.addEventListener('unhandledrejection',function(e){r(e.reason&&e.reason.message||'Unhandled rejection')})})()</script>`

const REACT_CDN_SCRIPTS = [
  'https://cdn.jsdelivr.net/npm/react@18/umd/react.production.min.js',
  'https://cdn.jsdelivr.net/npm/react-dom@18/umd/react-dom.production.min.js',
  'https://cdn.jsdelivr.net/npm/@babel/standalone/babel.min.js',
].map(src => `<script crossorigin src="${src}"></script>`).join('')

const REACT_PREAMBLE = `const{useState,useEffect,useRef,useMemo,useCallback,createContext,useContext,useReducer,Fragment}=React;`

const REACT_POSTAMBLE = `\nif(typeof App!=='undefined'&&document.getElementById('root')&&!document.getElementById('root').firstChild){ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(App))}`

function isHtmlContent(code: string): boolean {
  const t = code.trimStart()
  return t.startsWith('<!DOCTYPE') || t.startsWith('<html')
}

function buildSrcdoc(html: string): string {
  const cssVars = collectCssVars()
  const byteScript = buildByteScript()
  const injection = `<style>${cssVars}${BASE_STYLES}</style>${byteScript}${ERROR_SCRIPT}`

  if (!isHtmlContent(html)) {
    // React/JSX mode — model writes JSX, we wrap it in a full React shell
    return `<!DOCTYPE html><html><head><meta charset="utf-8">${injection}${REACT_CDN_SCRIPTS}</head><body><div id="root"></div><script type="text/babel" data-presets="react">${REACT_PREAMBLE}\n${html}\n${REACT_POSTAMBLE}<\/script>${RESIZE_SCRIPT}</body></html>`
  }

  // HTML mode — existing behavior, unchanged
  const trimmed = html.trimStart()
  if (trimmed.startsWith('<!DOCTYPE') || trimmed.startsWith('<html')) {
    let out = html
    if (/<head>/i.test(out)) {
      out = out.replace(/<head>/i, `<head>${injection}`)
    } else if (/<head /i.test(out)) {
      out = out.replace(/(<head[^>]*>)/i, `$1${injection}`)
    } else {
      out = injection + out
    }
    out = out.replace(/<\/body>/i, `${RESIZE_SCRIPT}</body>`)
    return out
  }

  return `<!DOCTYPE html><html><head><meta charset="utf-8">${injection}</head><body>${html}${RESIZE_SCRIPT}</body></html>`
}

export function ArtifactFrame({ html }: ArtifactFrameProps) {
  const isStreaming = useContext(StreamingContext)
  const [height, setHeight] = useState(0)
  const [loaded, setLoaded] = useState(false)
  const [renderError, setRenderError] = useState<string | null>(null)

  const srcdoc = useMemo(() => isStreaming ? '' : buildSrcdoc(html), [html, isStreaming])

  useEffect(() => {
    if (document.getElementById('byte-skeleton-style')) return
    const el = document.createElement('style')
    el.id = 'byte-skeleton-style'
    el.textContent = SKELETON_STYLE
    document.head.appendChild(el)
  }, [])

  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === 'byte-artifact-h' && typeof e.data.h === 'number') {
        setHeight(Math.min(Math.max(e.data.h + 4, 80), 960))
        setLoaded(true)
      }
      if (e.data?.type === 'byte-artifact-error') {
        setRenderError(e.data.message || 'Artifact failed to render')
        setLoaded(true)
      }
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [])

  useEffect(() => {
    setLoaded(false)
    setHeight(0)
    setRenderError(null)
  }, [html, isStreaming])

  return (
    <div style={{ margin: '16px 0', borderRadius: 'var(--r)', overflow: 'hidden' }}>
      {renderError ? (
        <div style={{
          padding: '10px 14px',
          background: 'var(--danger-bg)',
          color: 'var(--danger)',
          border: '1px solid var(--danger-border)',
          borderRadius: 'var(--r)',
          fontSize: 'calc(var(--fs) - 1px)',
        }}>
          Artifact failed to render
        </div>
      ) : (
        <>
          {(!loaded || isStreaming) && (
            <div style={{
              height: 120,
              background: 'var(--sf2)',
              animation: 'byte-skeleton 1.4s ease-in-out infinite',
            }} />
          )}
          {!isStreaming && (
            <iframe
              srcDoc={srcdoc}
              sandbox="allow-scripts allow-downloads allow-popups"
              style={{
                width: '100%',
                height: loaded ? height : 0,
                border: 'none',
                display: 'block',
                background: 'transparent',
              }}
              title="Preview"
            />
          )}
        </>
      )}
    </div>
  )
}
