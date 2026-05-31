import { useState, memo, useRef, useCallback } from "react";
import {
  Copy,
  Check,
  ThumbsUp,
  ThumbsDown,
  Share2,
  RefreshCw,
  ChevronDown,
  Loader2,
  FileText,
} from "lucide-react";
import { MarkdownRenderer } from "../../lib/markdown";
import type { Message, ToolCallEntry } from "../../types";

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

// Simple inline tool row for non-web-search tools
function ToolCallRow({ entry, isExpanded, onToggle }: {
  entry: ToolCallEntry;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div style={{ margin: "4px 0", padding: "4px 0" }}>
      <div
        onClick={onToggle}
        style={{
          display: "flex", alignItems: "center", gap: 6,
          cursor: "pointer", userSelect: "none",
          fontSize: "calc(var(--fs) - 1px)", color: "var(--tx3)",
        }}
      >
        {entry.status === "running" ? (
          <Loader2 size={11} style={{ color: "var(--acc)", animation: "spin 0.8s linear infinite", flexShrink: 0 }} />
        ) : (
          <span style={{ fontSize: 10, width: 11, flexShrink: 0, textAlign: "center" }}>▸</span>
        )}
        <FileText size={11} style={{ color: "var(--tx4)", flexShrink: 0 }} />
        <span style={{ flex: 1, color: "var(--tx2)" }}>{entry.header}</span>
        <ChevronDown
          size={10}
          style={{
            color: "var(--tx4)",
            transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.2s var(--ease-out-strong)",
            flexShrink: 0,
          }}
        />
      </div>
    </div>
  );
}

// Search commentary — shows per-entry commentary + status line with collapsible URL dropdown
function SearchCommentary({ entries, commentary: globalCommentary }: {
  entries: ToolCallEntry[];
  commentary: string;
}) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const toggleUrls = (id: string) => {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div
      role="status"
      aria-label="Searching the web"
      className="search-commentary"
      style={{ margin: "8px 0" }}
    >
      {/* Fallback: show global commentary if first entry has none */}
      {globalCommentary && entries.length > 0 && !entries[0].commentary && (
        <div style={{
          fontSize: "calc(var(--fs) + .5px)",
          color: "var(--tx)",
          lineHeight: 1.7,
          marginBottom: 6,
        }}>
          {globalCommentary}
        </div>
      )}

      {/* One entry per search tool — each with its own commentary + status + urls */}
      {entries.map((entry, i) => {
        const isRunning = entry.status === "running";
        const isError = entry.status === "error";
        const label = entry.header || entry.params?.query || "Searching\u2026";
        const sources = entry.fetchResults || [];
        const okCount = sources.filter(s => s.status === "ok").length;
        const errorCount = sources.filter(s => s.status === "error").length;
        const declinedCount = sources.filter(s => s.status === "declined").length;
        const deletedCount = sources.filter(s => s.status === "deleted").length;
        const isExpanded = expanded[entry.id] ?? entry.status === "running";

        const statusText = isRunning
          ? `${label}\u2026`
          : isError
            ? `Issue with ${label}`
            : `Finished ${label.charAt(0).toLowerCase()}${label.slice(1)}`;

        return (
          <div key={entry.id} style={{ margin: i > 0 ? "6px 0 0" : 0 }}>
            {/* Per-entry commentary */}
            {entry.commentary && (
              <div style={{
                fontSize: "calc(var(--fs) + .5px)",
                color: "var(--tx)",
                lineHeight: 1.7,
                marginBottom: 2,
              }}>
                {entry.commentary}
              </div>
            )}
            {/* Status line — clickable to expand URLs */}
            <div
              onClick={sources.length > 0 ? () => toggleUrls(entry.id) : undefined}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                padding: "2px 0",
                fontSize: "calc(var(--fs) - .5px)",
                lineHeight: 1.5,
                color: isError ? "var(--danger)" : "var(--tx3)",
                cursor: sources.length > 0 ? "pointer" : "default",
                userSelect: "none",
                animation: `searchCommentaryIn 0.25s var(--ease-out-strong) ${i * 80}ms both`,
              }}
            >
              {isRunning ? (
                <Loader2 size={11} style={{ color: "var(--acc)", animation: "spin 0.8s linear infinite", flexShrink: 0 }} />
              ) : (
                <ChevronDown
                  size={11}
                  style={{
                    color: "var(--tx4)",
                    flexShrink: 0,
                    transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
                    transition: "transform 0.2s var(--ease-out-strong)",
                  }}
                />
              )}
              <span style={{ flex: 1 }}>{statusText}</span>
              {(
                okCount > 0 || errorCount > 0 || declinedCount > 0 || deletedCount > 0
              ) && (
                <span style={{ fontSize: "calc(var(--fs) - 3px)", color: "var(--tx4)" }}>
                  {[
                    okCount > 0 ? `${okCount} fetched` : null,
                    errorCount > 0 ? `${errorCount} failed` : null,
                    deletedCount > 0 ? `${deletedCount} removed` : null,
                    declinedCount > 0 ? `${declinedCount} pending` : null,
                  ].filter(Boolean).join("\u00A0\u00B7\u00A0")}
                </span>
              )}
            </div>

            {/* Collapsible URL list */}
              {sources.length > 0 && (
              <div style={{
                maxHeight: isExpanded ? "300px" : "0",
                opacity: isExpanded ? 1 : 0,
                overflow: isExpanded ? "auto" : "hidden",
                transition: "max-height 0.25s var(--ease-out-strong), opacity 0.15s ease-out",
                marginLeft: 16,
                marginBottom: isExpanded ? 4 : 0,
              }}>
                {[...sources]
                  .sort((a, b) => {
                    const order: Record<string, number> = { ok: 0, error: 1, declined: 2, deleted: 3 };
                    return (order[a.status] ?? 3) - (order[b.status] ?? 3);
                  })
                  .map((fr, j) => (
                  <div key={fr.url} style={{
                    fontFamily: "var(--font)",
                    fontSize: "calc(var(--fs) - 3px)",
                    lineHeight: 1.65,
                    color: fr.status === "error" ? "var(--danger)" : fr.status === "deleted" ? "var(--tx4)" : fr.status === "ok" ? "var(--tx2)" : "var(--tx3)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    padding: "1px 0",
                    textDecoration: fr.status === "deleted" ? "line-through" : "none",
                    animation: `sourceFadeIn 0.3s var(--ease-out-strong) ${j * 60}ms both`,
                  }}>
                      {fr.status === "ok" && <span style={{ color: "var(--success)", marginRight: 4 }}>&#x2713;</span>}
                      {fr.status === "error" && <span style={{ color: "var(--danger)", marginRight: 4 }}>&#x2717;</span>}
                      {fr.status === "declined" && <span style={{ color: "var(--tx4)", marginRight: 4 }}>&#x25CB;</span>}
                      {fr.status === "deleted" && <span style={{ color: "var(--tx4)", marginRight: 4 }}>&#x2717;</span>}
                    {fr.url.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
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
  const [toolCallExpanded, setToolCallExpanded] = useState<Record<string, boolean>>({});
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

  // Strip tool calls from display
  if (!isUser) {
    // 1. Remove ALL markdown code blocks (tool_call JSON lives in code blocks)
    let stripped = displayContent.replace(/```[\s\S]*?```/g, "");

    // 2. Remove raw JSON objects containing "tool" key
    stripped = stripped.replace(
      /\{[\s\S]*?"tool"\s*:\s*"[^"]*"[\s\S]*?\}/g,
      "",
    );

    // 3. Remove JSON objects that look like tool call params (no "tool" key but has "query"+"count")
    stripped = stripped.replace(
      /\{[\s\S]*?"query"\s*:\s*"[^"]*"[\s\S]*?"count"\s*:\s*\d+[\s\S]*?\}/g,
      "",
    );
    stripped = stripped.replace(
      /\{[\s\S]*?"count"\s*:\s*\d+[\s\S]*?"query"\s*:\s*"[^"]*"[\s\S]*?\}/g,
      "",
    );

    // Use stripped for display
    displayContent = stripped.trim();
  }

  // Describe phase handling
  const isDescribing = message.describePhase === "describing";

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

  // ── Tool state (used by both content rendering and tool sections) ──
  const hasToolCalls = !!(message.toolCalls && message.toolCalls.length > 0);
  const allToolsDone = hasToolCalls && message.toolCalls!.every(tc => tc.status === "done");

  // Capture commentary ONCE when tools first appear
  const commentaryRef = useRef("");
  if (hasToolCalls && !isUser && displayContent && !commentaryRef.current) {
    commentaryRef.current = displayContent;
  }
  if (!hasToolCalls || isUser) commentaryRef.current = "";

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
  } else if (isStreaming || visible || (hasToolCalls && allToolsDone)) {
    // Streaming, visible, or tools done (answer streaming in) — render markdown
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

  // ── Claude-style Inline Tool Sections ──
  // Commentary text — shown for non-web-search tools only (web search commentary is inside SearchCommentaryBox)
  const hasWebSearchTool = hasToolCalls && message.toolCalls!.some(tc => tc.tool === "web_search");
  const commentaryText = hasToolCalls && !isUser && commentaryRef.current && !hasWebSearchTool ? (
    <p style={{ margin: 0 }}>{commentaryRef.current}</p>
  ) : null;

  // Inline tool sections — search commentary box for web searches, individual for other tools
  const toolSections = hasToolCalls && !isUser ? (() => {
    const webSearches = message.toolCalls!.filter(tc => tc.tool === "web_search");
    const others = message.toolCalls!.filter(tc => tc.tool !== "web_search");

    return (
      <>
        {webSearches.length > 0 && (
          <SearchCommentary
            entries={webSearches}
            commentary={commentaryRef.current}
          />
        )}
        {others.map((tc) => (
          <ToolCallRow
            key={tc.id}
            entry={tc}
            isExpanded={toolCallExpanded[tc.id] ?? false}
            onToggle={() => setToolCallExpanded(prev => ({ ...prev, [tc.id]: !prev[tc.id] }))}
          />
        ))}
      </>
    );
  })() : null;

  // Main answer content — show when tools are done or there's more than just commentary
  // With SearchCommentaryBox, commentary is shown inside the box; only show main content
  // when there's actual answer text beyond the commentary
  const isOnlyCommentary = allToolsDone && commentaryRef.current && displayContent === commentaryRef.current;
  const showMainContent = !hasToolCalls || (allToolsDone && !isOnlyCommentary);
  const mainContent = showMainContent ? content : null;

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
          {commentaryText}
          {toolSections}
          {mainContent}
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
