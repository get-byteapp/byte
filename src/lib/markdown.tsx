import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import rehypeHighlight from 'rehype-highlight'
import { useMemo, memo, createContext, useContext } from 'react'
import { CodeBlock } from '../components/shared/CodeBlock'
import { ArtifactFrame } from '../components/shared/ArtifactFrame'
import { CanvasPreview } from '../components/shared/CanvasPreview'
import type { CanvasDocument } from '../types'

export const StreamingContext = createContext(false)

export interface CanvasContextValue {
  documents: CanvasDocument[]
  onOpen: (id: string) => void
}
export const CanvasContext = createContext<CanvasContextValue>({ documents: [], onOpen: () => {} })

function preprocessMath(content: string): string {
  return content
    .replace(/\\\(([\s\S]*?)\\\)/g, '$$$1$$')
    .replace(/\\\[([\s\S]*?)\\\]/g, '$$$$$1$$$$')
    .replace(/\u2011/g, '-')   // non-breaking hyphen → regular hyphen
    .replace(/\u2010/g, '-')   // hyphen character → regular hyphen
    .replace(/\u2012/g, '-')   // figure dash → regular hyphen
    .replace(/\u2013/g, '-')   // en dash → hyphen
    .replace(/\u2014/g, '-')   // em dash → hyphen
    .replace(/\u202F/g, ' ')   // narrow no-break space → regular space
    .replace(/\u00A0/g, ' ')   // non-breaking space → regular space
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&gt;/g, '>')
    .replace(/&lt;/g, '<')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/')
}

function extractTextFromReactNode(node: React.ReactNode): string {
  if (typeof node === 'string') return decodeHtmlEntities(node)
  if (typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(extractTextFromReactNode).join('')
  if (node && typeof node === 'object' && 'props' in node) {
    return extractTextFromReactNode((node as any).props?.children)
  }
  return ''
}

interface DetailBlock {
  summary: string
  body: string
  original: string
}

function extractDetails(content: string): { content: string; details: DetailBlock[] } {
  const details: DetailBlock[] = []
  
  let processedContent = content.replace(
    /<details>\s*<summary>([\s\S]*?)<\/summary>([\s\S]*?)<\/details>/gi,
    (match, summary, body) => {
      const id = `DETAIL_${details.length}`
      const processedSummary = summary.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      const trimmedBody = body.trim()
      details.push({ summary: processedSummary, body: trimmedBody, original: match })
      return id
    }
  )
  
  return { content: processedContent, details }
}

// Memoized CodeBlock — prevents re-render when parent re-renders with same props
const MemoedCodeBlock = memo(CodeBlock)

// Stable component references — same object identity across renders, prevents ReactMarkdown from re-rendering all children
const mdComponents = {
  code: ({ className, children, ...props }: any) => {
    const fullLang = /language-([\w:#/.-]+)/.exec(className || '')
    const isInline = !fullLang
    const codeText = extractTextFromReactNode(children).replace(/\n$/, '')
    
    if (isInline) {
      return <code className={className} {...props}>{children}</code>
    }

    let lang = fullLang[1]
    let blockNoRun = false

    if (lang === 'render') {
      return <ArtifactFrame html={codeText} />
    }

    if (lang.endsWith(':norun')) {
      lang = lang.replace(/:norun$/, '')
      blockNoRun = true
    } else if (lang.endsWith(':n')) {
      lang = lang.replace(/:n$/, '')
      blockNoRun = true
    }

    return <MemoedCodeBlock language={lang} code={codeText} noRun={blockNoRun} />
  },
  pre: ({ children }: any) => {
    if (children && typeof children === 'object' && 'type' in children) {
      const childType = (children as any).type
      if (childType === MemoedCodeBlock || (typeof childType === 'function' && childType.name === 'CodeBlock')) {
        return <>{children}</>
      }
    }
    return <pre>{children}</pre>
  },
}

// noRun variant of components — same object identity
const mdComponentsNoRun = {
  code: ({ className, children, ...props }: any) => {
    const fullLang = /language-([\w:#/.-]+)/.exec(className || '')
    const isInline = !fullLang
    const codeText = extractTextFromReactNode(children).replace(/\n$/, '')
    if (isInline) return <code className={className} {...props}>{children}</code>
    let lang = fullLang[1]
    if (lang === 'render') return <ArtifactFrame html={codeText} />
    if (lang.endsWith(':norun')) lang = lang.replace(/:norun$/, '')
    else if (lang.endsWith(':n')) lang = lang.replace(/:n$/, '')
    return <MemoedCodeBlock language={lang} code={codeText} noRun />
  },
  pre: mdComponents.pre,
}

const remarkPlugins = [remarkGfm, remarkMath]
const rehypePluginsArr = [rehypeKatex, rehypeHighlight]

// MarkdownContent — stable component refs prevent unnecessary re-renders
function MarkdownContent({ content, noRun }: { content: string; noRun?: boolean }) {
  return (
    <ReactMarkdown
      remarkPlugins={remarkPlugins}
      rehypePlugins={rehypePluginsArr}
      components={noRun ? mdComponentsNoRun : mdComponents}
    >
      {content}
    </ReactMarkdown>
  )
}

// DetailBody — always noRun, memoized so dropdowns don't re-render unless body changes
const DetailBody = memo(function DetailBody({ body }: { body: string }) {
  return (
    <div className="md-body-content">
      <MarkdownContent content={body} noRun />
    </div>
  )
})

// Exported MarkdownRenderer — memoized on content string
export const MarkdownRenderer = memo(function MarkdownRenderer({
  content,
  isStreaming,
}: {
  content: string
  isStreaming?: boolean
}) {
  const canvasCtx = useContext(CanvasContext)

  const { processedContent, detailElements } = useMemo(() => {
    const { content: mainContent, details } = extractDetails(preprocessMath(content))
    const detailElements = details.map((detail, index) => {
      const id = `DETAIL_${index}`
      return {
        id,
        element: (
          <details className="md-details" key={id}>
            <summary className="md-summary" dangerouslySetInnerHTML={{ __html: detail.summary }} />
            <div className="md-details-body">
              <DetailBody body={detail.body} />
            </div>
          </details>
        ),
      }
    })
    return { processedContent: mainContent, detailElements }
  }, [content])

  const TOKEN_RE = /(DETAIL_\d+|CANVAS_PREVIEW_[a-f0-9-]+|CANVAS_LINK_[^\s]+)/
  const contentParts = processedContent.split(TOKEN_RE)

  return (
    <StreamingContext.Provider value={isStreaming ?? false}>
      <>
        {contentParts.map((part, index) => {
          if (part.startsWith('DETAIL_')) {
            const detailEl = detailElements.find(d => d.id === part)
            return detailEl ? (
              <div key={index} style={{ overflowX: 'auto', maxWidth: '100%' }}>
                {detailEl.element}
              </div>
            ) : null
          }

          if (part.startsWith('CANVAS_PREVIEW_')) {
            const id = part.replace('CANVAS_PREVIEW_', '')
            const doc = canvasCtx.documents.find(d => d.id === id)
            if (!doc) return null
            return (
              <div key={index} style={{ overflowX: 'auto', maxWidth: '100%' }}>
                <CanvasPreview
                  title={doc.title}
                  lang={doc.lang}
                  onOpen={() => canvasCtx.onOpen(id)}
                  isStreaming={doc.isStreaming}
                />
              </div>
            )
          }

          if (part.startsWith('CANVAS_LINK_')) {
            const encoded = part.replace('CANVAS_LINK_', '')
            const doc = canvasCtx.documents.find(
              d => d.title.replace(/[^a-zA-Z0-9_-]/g, '_') === encoded,
            )
            if (!doc) return null
            return (
              <div key={index} style={{ margin: '6px 0' }}>
                <button
                  onClick={() => canvasCtx.onOpen(doc.id)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '6px 12px',
                    borderRadius: 'var(--r)',
                    border: '1px solid var(--acc-border)',
                    background: 'var(--acc-soft)',
                    color: 'var(--acc)',
                    cursor: 'pointer',
                    fontFamily: 'var(--font)',
                    fontSize: 'var(--fs)',
                    transition: 'background 140ms ease-out',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--acc-hover)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'var(--acc-soft)')}
                >
                  Open Document: {doc.title} →
                </button>
              </div>
            )
          }

          if (!part.trim()) return null
          return (
            <div key={index} style={{ overflowX: 'auto', maxWidth: '100%' }}>
              <MarkdownContent content={part} />
            </div>
          )
        })}
      </>
    </StreamingContext.Provider>
  )
})