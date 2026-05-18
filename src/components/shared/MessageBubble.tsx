import { useState, memo, useRef, useCallback, useMemo } from "react";
import {
  Copy,
  Check,
  ThumbsUp,
  ThumbsDown,
  Share2,
  RefreshCw,
  ChevronDown,
  Search,
  Loader2,
  Globe,
} from "lucide-react";
import { MarkdownRenderer } from "../../lib/markdown";
import type { Message } from "../../types";

interface MessageBubbleProps {
  message: Message;
}

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

function LoadingDots() {
  return (
    <span
      className="loading-dots"
      style={{ display: "inline-flex", gap: "4px", alignItems: "center" }}
    >
      <span style={{ animationDelay: "0ms" }} />
      <span style={{ animationDelay: "150ms" }} />
      <span style={{ animationDelay: "300ms" }} />
    </span>
  );
}

function containsAskQuestion(content: string): boolean {
  return (
    content.includes('"tool":"ask_question"') ||
    content.includes('"tool": "ask_question"') ||
    content.includes("<ask_question>")
  );
}

function getAskQuestionDisplayText(content: string): string {
  try {
    const questionMatch = content.match(/"question"\s*:\s*"([^"]+)"/);
    if (questionMatch) {
      return questionMatch[1];
    }
  } catch {}
  return "Asking Question...";
}

// Hook that returns [ref, visible]. Once visible, stays visible forever.
function useLazyVisible(): [React.RefCallback<HTMLDivElement>, boolean] {
  const [visible, setVisible] = useState(false);
  const observedRef = useRef<HTMLDivElement | null>(null);

  const ref = useCallback((node: HTMLDivElement | null) => {
    if (!node) return;
    // Check if already in viewport
    const rect = node.getBoundingClientRect();
    if (rect.top < window.innerHeight + 600 && rect.bottom > -600) {
      setVisible(true);
      return;
    }
    // Observe until visible
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "600px 0px" },
    );
    observer.observe(node);
    // Cleanup previous observation if ref changes
    if (observedRef.current && observedRef.current !== node) {
      observer.disconnect();
    }
    observedRef.current = node;
  }, []);

  return [ref, visible];
}

export const MessageBubble = memo(function MessageBubble({
  message,
}: MessageBubbleProps) {
  const [copied, setCopied] = useState(false);
  const [showSources, setShowSources] = useState(true);
  const [showOcrText, setShowOcrText] = useState(true);
  const [lazyRef, visible] = useLazyVisible();

  const handleCopy = async () => {
    const success = await copyToClipboard(message.content);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const isUser = message.role === "user";
  const isGenerating = message.status === "streaming" && !message.content;
  const isStreaming = message.status === "streaming";

  const isAskQuestionResult =
    message.content.includes('"tool":"ask_question_result"') ||
    message.content.includes('"tool": "ask_question_result"');

  let displayContent = message.content;
  let showContent = true;

  // Hidden messages (e.g., search results context) are not rendered
  if (message.hidden) return null;

  // Strip tool calls from display — strip any {"tool":"..."} JSON blocks
  if (
    !isUser &&
    displayContent.includes('"tool"')
  ) {
    // 1. Remove markdown code blocks containing any tool call JSON
    displayContent = displayContent.replace(
      /```[\w-]*\s*[\s\S]*?```/g,
      (match) => {
        if (match.includes('"tool"')) {
          return "";
        }
        return match;
      },
    );

    // 2. Remove any remaining raw JSON blocks containing "tool"
    displayContent = displayContent.replace(
      /\{[\s\S]*?"tool"\s*:\s*"[^"]*"[\s\S]*?\}/g,
      "",
    );

    displayContent = displayContent.trim();
  }

  // Web search sources dropdown - real-time with Searched/Fetched sections
  const hasSearchSources =
    message.webSearchSources && message.webSearchSources.length > 0;
  const hasFetchedSources =
    message.webSearchFetched && message.webSearchFetched.length > 0;
  const isSearching = message.searchPhase === "searching";
  const isFetching = message.searchPhase === "fetching";
  const searchDone = message.searchPhase === "done";
  const showSearchDropdown =
    hasSearchSources || isSearching || isFetching || searchDone;

  // Describe phase handling
  const isDescribing = message.describePhase === "describing";

  // OCR phase handling
  const isExtractingOcr = message.ocrPhase === "extracting";
  const ocrDone = message.ocrPhase === "done";
  const [ocrPageIndex, setOcrPageIndex] = useState(0);

  // Parse OCR text into pages for multi-page navigation
  const ocrPages = useMemo(() => {
    if (!message.ocrText) return [];
    const parts = message.ocrText.split(/\n--- Page \d+ ---\n/);
    return parts.filter(Boolean);
  }, [message.ocrText]);
  const ocrPageCount = ocrPages.length;
  if (isExtractingOcr) {
    displayContent = "";
  }

  if (isUser && isAskQuestionResult) {
    displayContent = "Sent Answers";
  } else if (!isUser && containsAskQuestion(message.content)) {
    displayContent = getAskQuestionDisplayText(message.content);
  } else if (
    isUser &&
    message.content.startsWith("{") &&
    message.content.includes('"tool"')
  ) {
    showContent = false;
  }

  if (message.role === "system") {
    return (
      <div ref={lazyRef} className="msg" style={{ justifyContent: "center" }}>
        <div className="msg-body" style={{ textAlign: "center" }}>
          <div
            className="msg-txt"
            style={{ color: "var(--tx3)", fontSize: "calc(var(--fs) - 1px)" }}
          >
            {message.content}
          </div>
        </div>
      </div>
    );
  }

  // Decide what to render
  let content: React.ReactNode;
  if (isUser) {
    content = showContent ? (
      <span>{displayContent}</span>
    ) : (
      <span style={{ color: "var(--tx3)", fontStyle: "italic" }}>
        Sent Answers
      </span>
    );
  } else if (isGenerating) {
    content = <LoadingDots />;
  } else if (isStreaming || visible) {
    // Streaming or visible — render full markdown
    content = <MarkdownRenderer content={displayContent} />;
  } else {
    // Offscreen — show plain text as a lightweight placeholder
    content = (
      <div
        style={{
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
          color: "var(--tx2)",
        }}
      >
        {displayContent}
      </div>
    );
  }

  // Prepend describe phase indicator
  if (isDescribing) {
    content = (
      <>
        <div
          style={{
            background: "var(--sf2)",
            border: "1px solid var(--bd)",
            borderRadius: 10,
            padding: "8px 12px",
            marginBottom: 12,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <Loader2
            size={13}
            style={{
              color: "var(--acc)",
              animation: "spin 1s linear infinite",
            }}
          />
          <span
            style={{
              fontSize: "calc(var(--fs) - 1px)",
              color: "var(--tx2)",
              fontWeight: 500,
            }}
          >
            {message.content || "Analyzing images..."}
          </span>
        </div>
      </>
    );
  }

  // Prepend web search sources for assistant messages with real-time updates
  if (showSearchDropdown && !isUser) {
    content = (
      <>
        <div
          style={{
            background: "var(--sf2)",
            border: "1px solid var(--bd)",
            borderRadius: 10,
            overflow: "hidden",
            transition: "all 0.25s ease-out",
            marginBottom: 12,
          }}
        >
          {/* Header - always clickable to toggle */}
          <div
            onClick={() => setShowSources(!showSources)}
            style={{
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 12px",
              userSelect: "none",
              transition: "background 0.15s ease",
            }}
          >
            <Search size={13} style={{ color: "var(--acc)", flexShrink: 0 }} />
            <span
              style={{
                flex: 1,
                fontSize: "calc(var(--fs) - 1px)",
                color: "var(--tx2)",
                fontWeight: 500,
              }}
            >
              {isSearching && "Searching..."}
              {isFetching && "Fetching pages..."}
              {searchDone && "Search complete"}
            </span>
            {(isSearching || isFetching) && (
              <Loader2
                size={13}
                style={{
                  color: "var(--tx3)",
                  animation: "spin 1s linear infinite",
                }}
              />
            )}
            <ChevronDown
              size={13}
              style={{
                color: "var(--tx3)",
                transform: showSources ? "rotate(180deg)" : "none",
                transition: "transform 0.2s ease-out",
              }}
            />
          </div>

          {/* Expandable content - animated with height transition */}
          <div
            style={{
              maxHeight: showSources ? "800px" : "0",
              opacity: showSources ? 1 : 0,
              overflow: showSources ? "auto" : "hidden",
              transition: "max-height 0.25s ease-out, opacity 0.2s ease-out, padding 0.2s ease-out",
              padding: showSources ? "0 12px 10px" : "0 12px",
            }}
          >
              {/* Divider */}
              <div
                style={{ height: 1, background: "var(--bd)", marginBottom: 10 }}
              />

              {/* Searched section */}
              {hasSearchSources && (
                <div style={{ marginBottom: hasFetchedSources ? 10 : 0 }}>
                  <div
                    style={{
                      fontSize: "10px",
                      fontWeight: 600,
                      color: "var(--tx3)",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      marginBottom: 6,
                    }}
                  >
                    Searched
                  </div>
                  <div
                    style={{ display: "flex", flexDirection: "column", gap: 1 }}
                  >
                    {message.webSearchSources!.map((s, i) => (
                      <a
                        key={`searched-${i}`}
                        href={s.url}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          fontSize: "calc(var(--fs) - 2px)",
                          color: "var(--acc)",
                          textDecoration: "none",
                          padding: "3px 0",
                          transition: "opacity 0.2s ease-out",
                          animation: "fadeIn 0.2s ease-out",
                        }}
                        title={s.url}
                      >
                        <Globe
                          size={11}
                          style={{ flexShrink: 0, opacity: 0.6 }}
                        />
                        <span
                          style={{
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {s.title || s.url}
                        </span>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Fetched section */}
              {hasFetchedSources && (
                <div>
                  <div
                    style={{
                      fontSize: "10px",
                      fontWeight: 600,
                      color: "var(--acc)",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      marginBottom: 6,
                    }}
                  >
                    Fetched
                  </div>
                  <div
                    style={{ display: "flex", flexDirection: "column", gap: 1 }}
                  >
                    {message.webSearchFetched!.map((s, i) => (
                      <a
                        key={`fetched-${i}`}
                        href={s.url}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          fontSize: "calc(var(--fs) - 2px)",
                          color: "var(--acc)",
                          textDecoration: "none",
                          padding: "3px 0",
                          transition: "opacity 0.2s ease-out",
                          animation: "fadeIn 0.2s ease-out",
                        }}
                        title={s.url}
                      >
                        <Globe
                          size={11}
                          style={{ flexShrink: 0, opacity: 0.6 }}
                        />
                        <span
                          style={{
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {s.title || s.url}
                        </span>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

        <div style={{ marginTop: 8 }}>{content}</div>
      </>
    );
  }

  // OCR phase rendering — prepended above content like web search
  const ocrCard =
    (isExtractingOcr || ocrDone) && !isUser ? (
      <div
        style={{
          background: "var(--sf2)",
          border: "1px solid var(--bd)",
          borderRadius: 10,
          overflow: "hidden",
          transition: "all 0.25s ease-out",
          marginBottom: ocrDone && message.content ? 12 : 0,
        }}
      >
        <div
          onClick={() => ocrDone && setShowOcrText(!showOcrText)}
          style={{
            cursor: ocrDone ? "pointer" : "default",
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 12px",
            userSelect: "none",
            transition: "background 0.15s ease",
          }}
        >
          <svg
            width={13}
            height={13}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ color: "var(--acc)", flexShrink: 0 }}
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          <span
            style={{
              flex: 1,
              fontSize: "calc(var(--fs) - 1px)",
              color: isExtractingOcr ? "var(--tx2)" : "var(--tx)",
              fontWeight: 500,
            }}
          >
            {isExtractingOcr
              ? (message.content || "Extracting text...")
              : `OCR · ${message.ocrText ? message.ocrText.length : 0} chars`}
          </span>
          {isExtractingOcr && (
            <Loader2
              size={13}
              style={{
                color: "var(--acc)",
                animation: "spin 1s linear infinite",
              }}
            />
          )}
          {ocrDone && (
            <ChevronDown
              size={13}
              style={{
                color: "var(--tx3)",
                transform: showOcrText ? "rotate(180deg)" : "none",
                transition: "transform 0.2s ease-out",
              }}
            />
          )}
        </div>

        {/* Expandable content - animated with height transition */}
        <div
          style={{
            maxHeight: ocrDone && showOcrText && message.ocrText ? "800px" : "0",
            opacity: ocrDone && showOcrText && message.ocrText ? 1 : 0,
            overflow: ocrDone && showOcrText && message.ocrText ? "auto" : "hidden",
            transition: "max-height 0.25s ease-out, opacity 0.2s ease-out, padding 0.2s ease-out",
            padding: ocrDone && showOcrText && message.ocrText ? "0 12px 10px" : "0 12px",
          }}
        >
            <div
              style={{ height: 1, background: "var(--bd)", marginBottom: 10 }}
            />

            {/* Page navigation for multi-page */}
            {ocrPageCount > 1 && (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 8 }}>
                <button
                  onClick={() => setOcrPageIndex(Math.max(0, ocrPageIndex - 1))}
                  disabled={ocrPageIndex === 0}
                  style={{
                    background: "none", border: "none", cursor: ocrPageIndex > 0 ? "pointer" : "default",
                    color: ocrPageIndex > 0 ? "var(--tx2)" : "var(--tx4)", padding: 2,
                  }}
                >
                  <ChevronDown size={13} style={{ transform: "rotate(90deg)" }} />
                </button>
                <span style={{ fontSize: "calc(var(--fs) - 1px)", color: "var(--tx2)", fontWeight: 500 }}>
                  Page {ocrPageIndex + 1} / {ocrPageCount}
                </span>
                <button
                  onClick={() => setOcrPageIndex(Math.min(ocrPageCount - 1, ocrPageIndex + 1))}
                  disabled={ocrPageIndex >= ocrPageCount - 1}
                  style={{
                    background: "none", border: "none", cursor: ocrPageIndex < ocrPageCount - 1 ? "pointer" : "default",
                    color: ocrPageIndex < ocrPageCount - 1 ? "var(--tx2)" : "var(--tx4)", padding: 2,
                  }}
                >
                  <ChevronDown size={13} style={{ transform: "rotate(-90deg)" }} />
                </button>
              </div>
            )}

            <pre
              style={{
                fontSize: "calc(var(--fs) - 1.5px)",
                color: "var(--tx2)",
                lineHeight: 1.6,
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                margin: 0,
                fontFamily: "var(--font)",
              }}
            >
              {ocrPageCount > 1 ? ocrPages[ocrPageIndex] : message.ocrText}
            </pre>
          </div>
        </div>
    ) : null;

  // Render image attachments
  const attachmentContent =
    message.attachments && message.attachments.length > 0 ? (
      <div
        style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}
      >
        {message.attachments.map((att) => {
          // Only show image and PDF attachments in messages (files are embedded in text)
          if (att.type !== "image") return null;
          const isPdf = (att as any).mode === "pdf";
          
          return (
            <div
              key={att.id}
              style={{
                position: "relative",
                width: 120,
                borderRadius: 8,
                overflow: "hidden",
                border: `1px solid ${isPdf ? "#ef4444" : "var(--bd)"}`,
                background: "var(--sf2)",
              }}
            >
              <img
                src={att.dataUri}
                alt={att.fileName}
                style={{
                  width: "100%",
                  display: "block",
                  cursor: isPdf ? "default" : "pointer",
                }}
                onClick={() => !isPdf && window.open(att.dataUri, "_blank")}
              />
              {isPdf ? (
                <div
                  style={{
                    position: "absolute",
                    bottom: 0,
                    left: 0,
                    right: 0,
                    padding: "4px 6px",
                    background: "rgba(239, 68, 68, 0.9)",
                    fontSize: "9px",
                    color: "#fff",
                    textAlign: "center",
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                  }}
                >
                  PDF
                </div>
              ) : ((att.mode === "describe" && att.description) ||
                (att.mode === "ocr" && att.description)) && (
                <div
                  style={{
                    position: "absolute",
                    bottom: 0,
                    left: 0,
                    right: 0,
                    padding: "4px 6px",
                    background:
                      att.mode === "ocr"
                        ? "rgba(34, 197, 94, 0.9)"
                        : "rgba(0,0,0,0.7)",
                    fontSize: "9px",
                    color: "#fff",
                    textAlign: "center",
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                  }}
                  title={
                    att.mode === "ocr"
                      ? `Extracted text: ${att.description}`
                      : `Described by ${att.describedBy}: ${att.description}`
                  }
                >
                  {att.mode === "ocr" ? "OCR" : "Described"}
                </div>
              )}
            </div>
          );
        })}
      </div>
    ) : null;

  return (
    <div ref={lazyRef} className={`msg${isUser ? " u" : ""}`}>
      <div className="msg-body">
        <div className="msg-txt">
          {attachmentContent}
          {ocrCard}
          {content}
        </div>
        <div className="msg-acts">
          <button
            className="msg-act"
            onClick={handleCopy}
            title={copied ? "Copied!" : "Copy"}
          >
            {copied ? <Check size={13} /> : <Copy size={13} />}
          </button>
          {!isUser && (
            <>
              <button className="msg-act" title="Like">
                <ThumbsUp size={13} />
              </button>
              <button className="msg-act" title="Dislike">
                <ThumbsDown size={13} />
              </button>
              <button className="msg-act" title="Share">
                <Share2 size={13} />
              </button>
              <button className="msg-act" title="Regenerate">
                <RefreshCw size={13} />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
});
