import {
  useState,
  useEffect,
  useRef,
  useCallback,
  Dispatch,
  SetStateAction,
} from "react";
import { useStore } from "../../store/useStore";
import type {
  Message,
  ResponseStyleId,
  AskQuestionPayload,
  ToolId,
  ImageAttachment,
  ToolCallEntry,
} from "../../types";
import { MessageBubble } from "../shared/MessageBubble";
import { InputBox } from "../shared/InputBox";
import {
  sendChatMessage,
  streamChat,
  searchWithLangSearch,
  fetchPageWithJina,
  generateChatTitle,
  makeModelKey,
  resolveModel,
  describeImage,
} from "../../lib/api";
import { extractTextOCR } from "../../lib/ocr";
import { getSlashCommandPrompt } from "../../lib/slashCommands";
import { indexProjectFiles, queryProjectChunks, clearProjectIndex } from "../../lib/retrieval";
import { parseCanvasBlocks, StreamingCanvasParser } from '../../lib/canvasParser'
import { CanvasContext } from '../../lib/markdown'
import { CanvasPanel } from '../shared/CanvasPanel'
import type { CanvasDocument } from '../../types'


interface ChatViewProps {
  onAskQuestionDetected?: Dispatch<SetStateAction<AskQuestionPayload | null>>;
  activeAskQuestion?: AskQuestionPayload | null;
  activeSuggestMemory?: { name: string; content: string } | null;
}

export function ChatView({
  onAskQuestionDetected,
  activeAskQuestion,
  activeSuggestMemory,
}: ChatViewProps) {
  const {
    chats,
    activeChatId,
    updateChat,
    providers,
    selectedModelId,
    enabledModelIds,
    streamingEnabled,
    memories,
    langSearchApiKey,
    langSearchEnabled,
    setDefaultWebSearchEnabled,
    setDefaultCodeExecutionEnabled,
    projects,
    ocrEnabled,
  } = useStore();
  const effectiveLangSearchApiKey = langSearchEnabled ? langSearchApiKey : "";
  const [isLoading, setIsLoading] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const streamAbortRef = useRef<(() => void) | null>(null);
  const canvasParserRef = useRef<StreamingCanvasParser | null>(null);
  const canvasChatBufferRef = useRef<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isSearchingRef = useRef(false);
  const failedFetchUrlsRef = useRef<string[]>([]);
  const searchDepthRef = useRef(0);
  const executedOpsRef = useRef<Set<string>>(new Set());
  const pendingOpsRef = useRef<Op[]>([]);
  const titleGeneratedRef = useRef<Set<string>>(new Set());
  const chat = chats.find((c) => c.id === activeChatId);

  const canvasDocuments: CanvasDocument[] = chat?.canvasDocuments ?? []
  const activeCanvasId: string | null = chat?.activeCanvasId ?? null

  const handleCanvasOpen = (id: string) => {
    if (!activeChatId) return
    updateChat(activeChatId, { activeCanvasId: id })
  }
  const handleCanvasClose = () => {
    if (!activeChatId) return
    updateChat(activeChatId, { activeCanvasId: null })
  }
  const handleCanvasTabSwitch = (id: string) => {
    if (!activeChatId) return
    updateChat(activeChatId, { activeCanvasId: id })
  }

  const formatErrorContent = (err: unknown): string => {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("11434") || msg.includes("localhost:11434") || /ollama/i.test(msg)) {
      return `<details>
<summary>Connection to Ollama failed</summary>

\`\`\`
${msg}
\`\`\`

**Troubleshooting:**

- Make sure Ollama is running: \`ollama serve\`
- Verify the model is pulled: \`ollama list\`
- Keep it running after closing terminal: \`nohup ollama serve > /dev/null 2>&1 &\`
- Stop it: \`pkill ollama\`
- Or install the Ollama desktop app from [ollama.com](https://ollama.com) (runs in menubar)

Check that your provider settings point to the correct Ollama URL.</details>`;
    }
    return `Error: ${msg}`;
  };

  // Build project context for AI prompts + RAG retrieval
  const lastUserMessage = (messages: Message[]): string => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "user") return messages[i].content;
    }
    return "";
  };

  const getProjectContext = useCallback((userMessage?: string) => {
    if (!activeChatId) return undefined;
    const project = projects.find((p) => p.chatIds.includes(activeChatId));
    if (!project) return undefined;
    const parts: string[] = [];
    const hasInstructions = !!project.customInstructions;
    const hasFiles = project.files.length > 0;
    if (!hasInstructions && !hasFiles) return undefined;

    parts.push(`<project_context>\n<project_name>${project.name}</project_name>`);

    if (hasInstructions) {
      parts.push(
        `<custom_instructions>\n${project.customInstructions}\n</custom_instructions>`,
      );
    }

    if (hasFiles) {
      const fileLines = project.files.map((f) => {
        const sizeLabel = f.size >= 1024 ? `${(f.size / 1024).toFixed(1)} KB` : `${f.size} B`;
        return `- ${f.name} (${sizeLabel})`;
      });
      parts.push(`<project_files>\n${fileLines.join("\n")}\n</project_files>`);
    }

    // RAG: retrieve relevant chunks for the user's message
    if (hasFiles && userMessage) {
      const chunks = queryProjectChunks(project.id, userMessage, 5);
      if (chunks.length > 0) {
        const lines = chunks.map((c) => `[from ${c.fileName}]\n${c.content}`);
        parts.push(`<relevant_context>\n${lines.join("\n\n")}\n</relevant_context>`);
      }
    }

    parts.push("</project_context>");
    return parts.join("\n");
  }, [activeChatId, projects]);

  // Cache project file contents and build RAG index
  const projectFileContentsRef = useRef<Record<string, string>>({});
  useEffect(() => {
    const project = projects.find((p) => p.chatIds.includes(activeChatId || ""));
    if (!project) {
      projectFileContentsRef.current = {};
      clearProjectIndex(activeChatId || "");
      return;
    }
    if (project.files.length === 0) {
      projectFileContentsRef.current = {};
      clearProjectIndex(project.id);
      return;
    }
    const textExtRe = /\.(md|txt|csv|json|yaml|yml|xml|ts|tsx|js|jsx|py|java|cpp|go|rb|php|css|html|sql|sh|env)$/i;
    const binaryDocRe = /\.(pdf|docx|xlsx|xls|pptx)$/i;
    (async () => {
      const { invoke } = await import("@tauri-apps/api/core");
      const cache: Record<string, string> = {};
      const indexInputs: { id: string; name: string; content: string }[] = [];
      for (const f of project.files) {
        const isText = !f.type || f.type.startsWith("text/") ||
          ["application/json", "application/xml", "application/x-yaml",
           "application/javascript", "application/typescript"].includes(f.type) ||
          textExtRe.test(f.name);
        const isBinaryDoc = !isText && binaryDocRe.test(f.name);
        if (!isText && !isBinaryDoc) continue;
        try {
          const bytes: number[] = await invoke("read_project_file", {
            projectId: project.id,
            fileName: f.name,
          });
          const uint8 = new Uint8Array(bytes);
          let text: string | null = null;

          if (isText) {
            text = new TextDecoder().decode(uint8);
          } else if (isBinaryDoc) {
            // Extract text from binary document formats
            const ext = f.name.split(".").pop()?.toLowerCase();
            if (ext === "pdf") {
              const { extractPdfTextFromBytes } = await import("../../lib/fileConverter");
              text = await extractPdfTextFromBytes(uint8, f.name);
            } else if (ext === "docx") {
              const mammoth = await import("mammoth");
              const result = await mammoth.extractRawText({ arrayBuffer: uint8.buffer as ArrayBuffer });
              text = `# ${f.name}\n\n` + result.value;
            } else if (ext === "xlsx" || ext === "xls") {
              const XLSX = await import("xlsx");
              const workbook = XLSX.read(uint8, { type: "array" });
              const lines: string[] = [`# ${f.name}\n`];
              for (const sheetName of workbook.SheetNames) {
                const sheet = workbook.Sheets[sheetName];
                const json = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
                if (json.length === 0) continue;
                lines.push(`## ${sheetName}\n`);
                const maxCols = Math.max(...json.map((r) => r?.length || 0));
                const sep = "| " + Array(maxCols).fill("---").join(" | ") + " |";
                for (let i = 0; i < json.length; i++) {
                  const row = json[i] || [];
                  lines.push("| " + Array.from({length: maxCols}, (_, ci) => row[ci] !== undefined && row[ci] !== null ? String(row[ci]) : "").join(" | ") + " |");
                  if (i === 0) lines.push(sep);
                }
                lines.push("");
              }
              text = lines.join("\n");
            } else if (ext === "pptx") {
              const JSZip = await import("jszip");
              const zip = await JSZip.default.loadAsync(uint8);
              const slides = Object.keys(zip.files).filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n)).sort();
              const lines: string[] = [`# ${f.name}\n`];
              for (let i = 0; i < slides.length; i++) {
                const xml = await zip.files[slides[i]].async("text");
                const tagRegex = /<a:t[^>]*>([^<]+)<\/a:t>/g;
                const texts: string[] = [];
                let m;
                while ((m = tagRegex.exec(xml))) { const t = m[1].trim(); if (t) texts.push(t); }
                if (texts.length === 0) continue;
                lines.push(`## Slide ${i + 1}\n`);
                lines.push(texts.join("\n") + "\n");
              }
              text = lines.join("\n");
            }
          }

          if (text?.trim()) {
            cache[f.id] = text;
            indexInputs.push({ id: f.id, name: f.name, content: text });
          }
        } catch { /* skip unreadable */ }
      }
      projectFileContentsRef.current = cache;
      if (indexInputs.length > 0) {
        indexProjectFiles(project.id, indexInputs);
      } else {
        clearProjectIndex(project.id);
      }
    })();
  }, [activeChatId, projects]);

  // Get enabled models for fallback
  const enabledModels = providers.flatMap((p) =>
    p.models.filter((m) => enabledModelIds.includes(makeModelKey(p.id, m.id))),
  );

  const messagesLength = chat?.messages.length ?? 0;
  const lastContent = chat?.messages[messagesLength - 1]?.content;
  const [showScrollButton, setShowScrollButton] = useState(false);
  const chatMsgsRef = useRef<HTMLDivElement>(null);
  const wasAtBottomRef = useRef(true);

  const checkIfAtBottom = useCallback(() => {
    if (!chatMsgsRef.current) return true;
    const { scrollHeight, scrollTop, clientHeight } = chatMsgsRef.current;
    return scrollHeight - scrollTop - clientHeight < 20;
  }, []);

  const handleScroll = useCallback(() => {
    if (!chatMsgsRef.current) return;
    wasAtBottomRef.current = checkIfAtBottom();
    setShowScrollButton(!wasAtBottomRef.current);
  }, [checkIfAtBottom]);

  const scrollToBottom = useCallback(() => {
    if (chatMsgsRef.current) {
      wasAtBottomRef.current = true;
      setShowScrollButton(false);
      chatMsgsRef.current.scrollTo({
        top: chatMsgsRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, []);

  useEffect(() => {
    if (wasAtBottomRef.current && chatMsgsRef.current) {
      chatMsgsRef.current.scrollTop = chatMsgsRef.current.scrollHeight;
    }
  }, [messagesLength, lastContent]);

  const handleStop = useCallback(() => {
    if (streamAbortRef.current) {
      streamAbortRef.current();
      streamAbortRef.current = null;
    } else if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsLoading(false);
    abortControllerRef.current = null;
  }, []);

  const handleStyleChange = useCallback(
    (style: ResponseStyleId) => {
      if (activeChatId && chat?.config) {
        updateChat(activeChatId, {
          config: { ...chat.config, responseStyle: style },
        });
      }
    },
    [activeChatId, chat?.config, updateChat],
  );

  const handleMemoryToggle = useCallback(
    (enabled: boolean) => {
      if (activeChatId && chat?.config) {
        updateChat(activeChatId, {
          config: { ...chat.config, memoryEnabled: enabled },
        });
      }
    },
    [activeChatId, chat?.config, updateChat],
  );

  const handleCodeExecutionToggle = useCallback(
    (enabled: boolean) => {
      if (activeChatId && chat?.config) {
        const newTools = enabled
          ? [...(chat.config.enabledTools || []).filter((t) => t !== "CODE_EXECUTION"), "CODE_EXECUTION" as ToolId]
          : (chat.config.enabledTools || []).filter((t) => t !== "CODE_EXECUTION");
        updateChat(activeChatId, { config: { ...chat.config, enabledTools: newTools } });
        setDefaultCodeExecutionEnabled(enabled);
      }
    },
    [activeChatId, chat?.config, updateChat, setDefaultCodeExecutionEnabled],
  );

  // Sync defaultCodeExecutionEnabled when switching chats
  useEffect(() => {
    if (chat?.config) {
      setDefaultCodeExecutionEnabled(
        chat.config.enabledTools?.includes("CODE_EXECUTION") ?? false,
      );
    }
  }, [activeChatId, chat?.config, setDefaultCodeExecutionEnabled]);

  const codeExecutionEnabled = chat?.config?.enabledTools?.includes("CODE_EXECUTION") ?? false;

  const handleWebSearchToggle = useCallback(
    (enabled: boolean) => {
      if (activeChatId && chat?.config) {
        const newTools = enabled
          ? [
              ...chat.config.enabledTools.filter((t) => t !== "WEB_SEARCH"),
              "WEB_SEARCH" as ToolId,
            ]
          : chat.config.enabledTools.filter((t) => t !== "WEB_SEARCH");
        updateChat(activeChatId, {
          config: { ...chat.config, enabledTools: newTools },
        });
        setDefaultWebSearchEnabled(enabled);
      }
    },
    [activeChatId, chat?.config, updateChat, setDefaultWebSearchEnabled],
  );

  // Sync defaultWebSearchEnabled when switching chats
  useEffect(() => {
    if (chat?.config) {
      setDefaultWebSearchEnabled(
        chat.config.enabledTools?.includes("WEB_SEARCH") ?? false,
      );
    }
  }, [activeChatId, chat?.config, setDefaultWebSearchEnabled]);

  const webSearchEnabled =
    chat?.config?.enabledTools?.includes("WEB_SEARCH") ?? false;

  // Parse web_search tool from assistant response
  interface WebSearchParams {
    query: string;
    header?: string;
    topic?: string;
    count?: number;
    freshness?: string;
    fetch_urls?: number[];
    decline?: number[];
  }

  // Parsed tool operation from the AI response
  interface Op {
    type: "web_search" | "fetch" | "delete" | "save";
    commentary?: string; // only for tools
    // web_search
    header?: string;
    query?: string;
    count?: number;
    freshness?: string;
    // fetch / delete
    indices?: number[];
    // save
    index?: number;
    summary?: string;
  }

  // Parse ALL operations from the AI response — tools + subtools
  const parseOperations = (content: string): Op[] => {
    if (!content || content.trim().length < 10) {
      console.log("[PARSE] Content too short, returning empty");
      return [];
    }
    let cleaned = content
      .replace(/\\```[\w-]*\n?/g, "")
      .replace(/```[\w-]*\n?/g, "")
      .trim();
    const results: Op[] = [];
    // Extract commentary between blocks — store positions of each JSON block
    const blockPositions: { start: number; end: number }[] = [];
    const blockRegex = /\{[\s\S]*?"(?:tool|subtool)"\s*:\s*"[^"]*"[\s\S]*?\}/g;
    let blockMatch;
    while ((blockMatch = blockRegex.exec(cleaned)) !== null) {
      blockPositions.push({ start: blockMatch.index, end: blockMatch.index + blockMatch[0].length });
    }

    // Get text before a given block index
    const getCommentary = (blockIdx: number): string => {
      if (blockIdx === 0) return cleaned.slice(0, blockPositions[0].start).trim();
      return cleaned.slice(blockPositions[blockIdx - 1].end, blockPositions[blockIdx].start).trim();
    };

    // Match all JSON blocks in order (both tool and subtool)
    const regex = /\{[\s\S]*?"(?:tool|subtool)"\s*:\s*"[^"]*"[\s\S]*?\}/g;
    let match;
    const seenQueries = new Set<string>();
    let blockIdx = 0;
    while ((match = regex.exec(cleaned)) !== null) {
      try {
        const payload = JSON.parse(match[0]);
        const tool = payload.tool || payload.subtool;
        if (tool === "web_search" || tool === "search") {
          if (payload.query && !seenQueries.has(payload.query)) {
            seenQueries.add(payload.query);
            const commentary = getCommentary(blockIdx);
            results.push({
              type: "web_search",
              header: payload.header || payload.query,
              query: payload.query,
              count: payload.count ?? 10,
              freshness: payload.freshness || "oneMonth",
              commentary: commentary || undefined,
            });
            console.log("[PARSE] Found web_search: query='%s' header='%s' commentary='%s'", payload.query.slice(0, 50), payload.header, (commentary || "").slice(0, 50));
          }
        } else if (tool === "fetch" && Array.isArray(payload.indices)) {
          results.push({ type: "fetch", indices: payload.indices });
          console.log("[PARSE] Found fetch: indices=%s", JSON.stringify(payload.indices));
        } else if (tool === "delete" && Array.isArray(payload.indices)) {
          results.push({ type: "delete", indices: payload.indices });
          console.log("[PARSE] Found delete: indices=%s", JSON.stringify(payload.indices));
        } else if (tool === "save" && typeof payload.index === "number") {
          results.push({
            type: "save",
            index: payload.index,
            summary: typeof payload.summary === "string" ? payload.summary : "",
          });
          console.log("[PARSE] Found save: index=%s", JSON.stringify(payload.index));
        } else {
          console.log("[PARSE] Unknown operation: tool=%s", tool);
        }
      } catch (e) {
        console.log("[PARSE] Failed to parse JSON block:", match[0].slice(0, 80));
      }
      blockIdx++;
    }
    console.log("[PARSE] Total operations found:", results.length);
    return results;
  };

  // Extract commentary: text before the first tool-fence line
  const commentaryBeforeFence = (content: string): string => {
    if (!content) return "";
    const fenceIdx = content.search(/```tool_calls?\b/);
    if (fenceIdx < 0) return content.trim();
    return content.slice(0, fenceIdx);
  };

  // Extract per-tool commentary from response text between blocks
  const extractToolCommentary = (content: string, _toolNames?: string[]): string => {
    if (!content) return "";
    const cleaned = content
      .replace(/\\```[\w-]*\n?/g, "")
      .replace(/```[\w-]*\n?/g, "")
      .trim();
    // Get text before the first JSON block with "tool" or "subtool"
    const firstBlock = cleaned.search(/\{[\s\S]*?"(?:tool|subtool)"\s*:\s*"[^"]*"[\s\S]*?\}/);
    if (firstBlock <= 0) return "";
    return cleaned.slice(0, firstBlock).trim();
  };

  // Format search results for AI context (snippets only)
  const formatSearchResults = (
    query: string,
    results: Array<{ name: string; url: string; snippet: string }>,
  ): string => {
    if (results.length === 0) return `[No search results found for "${query}"]`;
    return `[Web search results for "${query}"]\n\n${results
      .map(
        (r, i) =>
          `${i + 1}. **${r.name}**\n   URL: ${r.url}\n   ${r.snippet || ""}`,
      )
      .join("\n\n")}`;
  };

  // Handle ONE operation, then trigger follow-up for the next
  const executeOneOp = useCallback(
    async (
      chatId: string,
      toolMsgId: string,
      op: Op,
      currentMessages: Message[],
      ) => {
        // Dedup: skip if this exact operation was already executed
        const opKey = `${op.type}:${op.header || ""}:${op.query || ""}:${JSON.stringify(op.indices || [])}:${op.index ?? ""}:${op.summary ?? ""}`;
        if (executedOpsRef.current.has(opKey)) {
          console.log("[EXEC] SKIP duplicate op:", opKey);
          return currentMessages;
        }
        executedOpsRef.current.add(opKey);
        
        const hiddenMessages: Message[] = [];
        console.log("[EXEC] Starting operation: type=%s header=%s query=%s", op.type, op.header || "", op.query ? op.query.slice(0, 50) : "");
        console.log("[EXEC] Full op:", JSON.stringify(op));
        console.log("[EXEC] Op key for dedup:", opKey);

      if (op.type === "web_search") {
        const query = op.query || "";
        const count = op.count ?? 10;
        const freshness = op.freshness || "oneMonth";

        console.log("[BYTE] Searching:", query);
        const searchResults = await searchWithLangSearch(query, effectiveLangSearchApiKey, { count, freshness });
        console.log("[EXEC] Search API returned", searchResults.length, "results for:", query.slice(0, 50));
        if (searchResults.length > 0) console.log("[EXEC] First result URL:", searchResults[0].url);

        const entry: ToolCallEntry = {
          id: crypto.randomUUID(),
          tool: "web_search",
          header: op.header || query,
          commentary: op.commentary,
          params: { query, freshness, count },
          status: "done",
          fetchResults: searchResults.map((r: any) => ({
            url: r.url,
            title: r.name || r.displayUrl,
            status: "declined" as const,
          })),
        };

        updateChat(chatId, {
          messages: currentMessages.map(m =>
            m.id === toolMsgId
              ? { ...m, toolCalls: [...(m.toolCalls || []), entry] }
              : m
          ),
        });
        console.log("[EXEC] web_search done: created toolCall entry, %d results as declined", searchResults.length);

        hiddenMessages.push({
          id: crypto.randomUUID(),
          role: "user",
          content: `[Web search results for "${query}"]\n\n${searchResults
            .map((r: any, i: number) => `${i + 1}. **${r.name || r.displayUrl}**\n   URL: ${r.url}\n   ${r.snippet || ""}`)
            .join("\n\n")}\n\nHIGHLY RECOMMENDED: Fetch at least 1 URL with {"subtool":"fetch","indices":[0]} to get full page content before answering. After fetching, synthesize the results and provide your answer — do not ask the user more questions unless you have to. Subtools (fetch/delete/save) must not have any commentary text before them — just the bare fenced block.`,
          timestamp: Date.now(),
          status: "sent",
          hidden: true,
        });
      } else if (op.type === "fetch" && op.indices) {
        console.log("[EXEC] Fetching indices:", JSON.stringify(op.indices));
        const chatNow = useStore.getState().chats.find(c => c.id === chatId);
        const allEntries = (chatNow?.messages || []).flatMap(m => m.toolCalls || []);
        const webSearchEntries = allEntries.filter(tc => tc.tool === "web_search");
        const latestSearch = webSearchEntries[webSearchEntries.length - 1];
        const parentMsgId = latestSearch
          ? (chatNow?.messages.find(m => (m.toolCalls || []).some(tc => tc.id === latestSearch.id))?.id || toolMsgId)
          : toolMsgId;
        if (!latestSearch || !latestSearch.fetchResults) {
          console.log("[EXEC] No web_search entry found for fetch, skipping");
        } else {
          console.log("[EXEC] Latest web_search:", latestSearch.header, "has", latestSearch.fetchResults.length, "results");
        }
        if (!latestSearch || !latestSearch.fetchResults) return currentMessages;

        for (const idx of op.indices) {
          const result = latestSearch.fetchResults[idx];
          if (!result || result.status !== "declined") {
            console.log("[EXEC] Skip fetch index", idx, "- status:", result?.status, "url:", result?.url);
            continue;
          }
          console.log("[EXEC] Fetching index", idx, ":", result.url);
          try {
            const content = await fetchPageWithJina(result.url);
            console.log("[EXEC] Fetched OK:", result.url, "content length:", content.length);
            const truncated = content.slice(0, 3000);
            hiddenMessages.push({
              id: crypto.randomUUID(),
              role: "user",
              content: `--- Full content from ${result.url} ---\n${truncated}`,
              timestamp: Date.now(),
              status: "sent",
              hidden: true,
            });
            const c2 = useStore.getState().chats.find(c => c.id === chatId);
            if (c2) updateChat(chatId, {
              messages: c2.messages.map(m =>
                m.id === parentMsgId
                  ? {
                      ...m,
                      toolCalls: (m.toolCalls || []).map(tc =>
                        tc.id === latestSearch.id
                          ? { ...tc, fetchResults: (tc.fetchResults || []).map((fr, fi) =>
                              fi === idx ? { ...fr, status: "ok" as const } : fr
                            )}
                          : tc
                      ),
                    }
                  : m
              ),
            });
            console.log("[EXEC] Updated UI: marked index", idx, "as ok for url:", result.url);
          } catch {
            // skip unscrapeable
            console.log("[EXEC] Fetch FAILED:", result.url);
          }
        }
      } else if (op.type === "delete" && op.indices) {
        console.log("[EXEC] Deleting indices:", JSON.stringify(op.indices));
        const chatNow = useStore.getState().chats.find(c => c.id === chatId);
        const allEntries = (chatNow?.messages || []).flatMap(m => m.toolCalls || []);
        const webSearchEntries = allEntries.filter(tc => tc.tool === "web_search");
        const latestSearch = webSearchEntries[webSearchEntries.length - 1];
        const parentMsgId = latestSearch
          ? (chatNow?.messages.find(m => (m.toolCalls || []).some(tc => tc.id === latestSearch.id))?.id || toolMsgId)
          : toolMsgId;
        if (latestSearch && chatNow) {
          console.log("[EXEC] Delete on web_search:", latestSearch.header);
          updateChat(chatId, {
            messages: chatNow.messages.map(m =>
              m.id === parentMsgId
                ? {
                    ...m,
                    toolCalls: (m.toolCalls || []).map(tc =>
                      tc.id === latestSearch.id
                        ? { ...tc, fetchResults: (tc.fetchResults || []).map((fr, fi) =>
                            op.indices!.includes(fi) ? { ...fr, status: "deleted" as const } : fr
                          )}
                        : tc
                    ),
                  }
                : m
            ),
          });
        }
      } else if (op.type === "save" && op.index !== undefined) {
        console.log("[EXEC] Saving index:", op.index);
        const chatNow = useStore.getState().chats.find(c => c.id === chatId);
        const allEntries = (chatNow?.messages || []).flatMap(m => m.toolCalls || []);
        const webSearchEntries = allEntries.filter(tc => tc.tool === "web_search");
        const latestSearch = webSearchEntries[webSearchEntries.length - 1];
        const parentMsgId = latestSearch
          ? (chatNow?.messages.find(m => (m.toolCalls || []).some(tc => tc.id === latestSearch.id))?.id || toolMsgId)
          : toolMsgId;
        if (latestSearch && chatNow) {
          const savedUrl = (latestSearch.fetchResults || [])[op.index]?.url || "";
          updateChat(chatId, {
            messages: chatNow.messages.map(m =>
              m.id === parentMsgId
                ? {
                    ...m,
                    toolCalls: (m.toolCalls || []).map(tc =>
                      tc.id === latestSearch.id
                        ? { ...tc, fetchResults: (tc.fetchResults || []).map((fr, fi) =>
                            fi === op.index ? { ...fr, status: "deleted" as const } : fr
                          )}
                        : tc
                    ),
                  }
                : m
            ),
          });
          if ((op.summary || "").trim()) {
            hiddenMessages.push({
              id: crypto.randomUUID(),
              role: "user",
              content: `[Saved summary from ${savedUrl}]\n${op.summary}`,
              timestamp: Date.now(),
              status: "sent",
              hidden: true,
            });
          }
        }
      }

      // Append hidden results and start follow-up
      const { provider, model } = resolveModel(providers, selectedModelId);
      if (!provider || !model) return currentMessages;

      const freshChat = useStore.getState().chats.find(c => c.id === chatId);
      if (!freshChat) return currentMessages;

      const freshMsg = freshChat.messages.find(m => m.id === toolMsgId);
      const resultMessages = [...(freshChat.messages || [])];
      const toolIdx = resultMessages.findIndex(m => m.id === toolMsgId);
      if (toolIdx >= 0 && freshMsg) {
        resultMessages[toolIdx] = freshMsg;
        resultMessages.splice(toolIdx + 1, 0, ...hiddenMessages);
      }
      updateChat(chatId, { messages: resultMessages });

      // Start follow-up stream
      console.log("[EXEC] Starting follow-up stream. Hidden messages added:", hiddenMessages.length);
      if (streamingEnabled) {
        let followUpStarted = false;
        streamChat(
          provider, model, resultMessages,
          (chunk) => {
            const c = useStore.getState().chats.find(x => x.id === chatId);
            if (!c) return;
            const ex = c.messages.find(m => m.id === toolMsgId);
            let acc: string;
            if (!followUpStarted) { followUpStarted = true; acc = chunk; }
            else { acc = (ex?.rawContent || ex?.content || "") + chunk; }
            const hasFence = /```tool_calls?\b/.test(acc);
            const isSubtool = hasFence && /"subtool"\s*:/.test(acc);
            const disp = hasFence
              ? (isSubtool ? "" : commentaryBeforeFence(acc))
              : acc;
            updateChat(chatId, {
              messages: c.messages.map(m =>
                m.id === toolMsgId ? { ...m, content: disp, rawContent: acc } : m
              ),
            });
          },
          () => {
            const c = useStore.getState().chats.find(x => x.id === chatId);
            if (!c) return;
            const ex = c.messages.find(m => m.id === toolMsgId);
            const rawResp = ex?.rawContent || ex?.content || "";
            console.log("[FOLLOWUP] Stream complete. rawResp length:", rawResp.length);
            console.log("[FOLLOWUP] rawResp start:", rawResp.slice(0, 200));
            const nextOps = parseOperations(rawResp);
            console.log("[FOLLOWUP] Next operations found:", nextOps.length, "| pending:", pendingOpsRef.current.length);
            if (nextOps.length > 0) {
              console.log("[FOLLOWUP] Recursing with next op from follow-up:", nextOps[0].type, nextOps[0].header || "");
              pendingOpsRef.current = [];
              executeOneOp(chatId, toolMsgId, nextOps[0], c.messages);
            } else if (pendingOpsRef.current.length > 0) {
              const nextPend = pendingOpsRef.current.shift()!;
              console.log("[FOLLOWUP] No new ops, using pending:", nextPend.type, nextPend.header || "");
              executeOneOp(chatId, toolMsgId, nextPend, c.messages);
            } else {
              console.log("[FOLLOWUP] No more operations. Marking done.");
              updateChat(chatId, {
                messages: c.messages.map(m =>
                  m.id === toolMsgId ? { ...m, content: rawResp, status: "done" as const } : m
                ),
              });
            }
          },
          (error) => {
            updateChat(chatId, {
              messages: (useStore.getState().chats.find(x => x.id === chatId)?.messages || []).map(m =>
                m.id === toolMsgId ? { ...m, content: m.content || `Error: ${error.message}`, status: "error" as const } : m
              ),
            });
          },
          freshChat.config, memories, undefined,
          getProjectContext(lastUserMessage(currentMessages)),
          undefined,
          !!effectiveLangSearchApiKey,
        );
      }
      return resultMessages;
    },
    [effectiveLangSearchApiKey, providers, selectedModelId, enabledModels, streamingEnabled, memories, updateChat],
  );

  // Backward compat: parseAllWebSearchTools wraps parseOperations
  const parseAllWebSearchTools = (content: string): { query: string; header?: string; topic?: string; count?: number; freshness?: string; fetch_urls?: number[]; decline?: number[] }[] => {
    return parseOperations(content)
      .filter((op): op is Op & { type: "web_search" } => op.type === "web_search")
      .map(op => ({
        query: op.query || "",
        header: op.header,
        topic: undefined,
        count: op.count,
        freshness: op.freshness,
      }));
  };

  const handleWebSearchTool = useCallback(
    async (
      chatId: string,
      toolMsgId: string,
      params: WebSearchParams,
      currentMessages: Message[],
      isLastSearch?: boolean,
    ) => {
      // Deduplicate: skip if same query+header already completed
      const chatState = useStore.getState().chats.find((c) => c.id === chatId);
      const toolMsg = chatState?.messages.find((m) => m.id === toolMsgId);
      const alreadyDone = (toolMsg?.toolCalls || []).some(
        (tc) => tc.tool === "web_search" && tc.status === "done" && tc.header === (params.header || params.query) && tc.params?.query === params.query,
      );
      if (alreadyDone) {
        console.log("[BYTE] Skipping duplicate search:", params.query.slice(0, 40));
        return;
      }
      console.log("[BYTE] Tool running:", params.query.slice(0, 60), "| header:", params.header);

      // Safety timeout: force-reset search lock after 60s
      const safetyTimeout = setTimeout(() => {
        console.warn("[BYTE TOOL] Search timed out after 60s, resetting lock");
        isSearchingRef.current = false;
      }, 60000);

      try {
// Phase 1: Show searching state — preserve any commentary text from the AI
        // Don't create duplicate entries — caller already added them to toolCalls

        updateChat(chatId, {
          messages: currentMessages.map((m) =>
            m.id === toolMsgId
              ? { ...m, searchPhase: "searching" as const }
              : m,
          ),
        });

        const searchResults = await searchWithLangSearch(
          params.query,
          effectiveLangSearchApiKey,
          {
            count: params.count,
            freshness: params.freshness,
          },
        );
        // Phase 2: Show all searched results immediately on the running entry
        const declinedIndices = params.decline || [];
        const allFetchResults = searchResults.map((r, idx) => ({
          url: r.url,
          title: r.name || r.displayUrl,
          status: declinedIndices.includes(idx) ? "declined" as const : "error" as const,
        }));
        updateChat(chatId, {
          messages: currentMessages.map((m) =>
            m.id === toolMsgId
              ? {
                  ...m,
                  searchPhase: "fetching" as const,
                  toolCalls: (() => {
                    let found = false;
                    return (m.toolCalls || []).map((tc) => {
                      if (tc.tool === "web_search" && tc.status === "running" && !found) {
                        found = true;
                        return { ...tc, fetchResults: allFetchResults };
                      }
                      return tc;
                    });
                  })(),
                }
              : m,
          ),
        });
        const indicesToFetch = params.fetch_urls?.length
          ? params.fetch_urls.filter((i) => i >= 0 && i < searchResults.length)
          : [0, 1].filter((i) => i < searchResults.length);

        const jinaResults: string[] = [];
        for (const i of indicesToFetch) {
          try {
            const content = await fetchPageWithJina(searchResults[i].url);
            jinaResults.push(
              `--- Full content from ${searchResults[i].url} ---\n${content.slice(0, 3000)}`,
            );

            // Phase 3: Update with each successful fetch in real-time
            const fetchUrl = searchResults[i].url;
            const fetchTitle = searchResults[i].name || searchResults[i].displayUrl;
            const freshChat = useStore
              .getState()
              .chats.find((c) => c.id === chatId);
            if (freshChat) {
              updateChat(chatId, {
                messages: freshChat.messages.map((m) =>
                  m.id === toolMsgId
                    ? {
                        ...m,
                        // Update the matching URL status to "ok" on the first running entry
                        toolCalls: (() => {
                          let found = false;
                          return (m.toolCalls || []).map((tc) => {
                            if (tc.tool === "web_search" && tc.status === "running" && !found) {
                              found = true;
                              return {
                                ...tc,
                                fetchResults: (tc.fetchResults || []).map((fr) =>
                                  fr.url === fetchUrl
                                    ? { ...fr, status: "ok" as const, title: fr.title || fetchTitle }
                                    : fr,
                                ),
                              };
                            }
                            return tc;
                          });
                        })(),
                      }
                    : m,
                ),
              });
            }
          } catch (err: any) {
            const errMsg = err?.message || String(err);
            // Skip 451 (unscrapeable) and 403 (forbidden) silently — just use snippets
            if (errMsg.includes("451") || errMsg.includes("403")) {
              // Silently skip unscrapeable pages
            } else {
              failedFetchUrlsRef.current.push(searchResults[i].url);
            }
          }
        }

        // If all requested URLs failed (e.g., 451 errors), inform the AI to try alternatives
        const totalUrlsToTry = params.fetch_urls?.length || Math.min(2, searchResults.length);
        let feedbackMsg: Message | null = null;
        
        if (failedFetchUrlsRef.current.length >= totalUrlsToTry && searchResults.length > 0) {
          const failedUrls = failedFetchUrlsRef.current.join(', ');
          const alternativeUrls = searchResults
            .filter(r => !failedFetchUrlsRef.current.includes(r.url))
            .slice(0, 3)
            .map((r, i) => `${i}: ${r.url}`)
            .join('\n');
          
          const feedback = `The following URLs were unscrapable (451 error or blocked): ${failedUrls}.\n\nPlease try fetching these alternative URLs instead:\n${alternativeUrls}\n\nOr run a new web_search with a different query to find accessible sources.`;
          
          feedbackMsg = {
            id: crypto.randomUUID(),
            role: "user",
            content: feedback,
            timestamp: Date.now(),
            status: "sent",
            hidden: true,
          };
        }
        failedFetchUrlsRef.current = []; // Reset for next search

        let formattedResults = formatSearchResults(params.query, searchResults);
        if (jinaResults.length > 0) {
          formattedResults += "\n\n" + jinaResults.join("\n\n");
        }

        const resultsMsg: Message = {
          id: crypto.randomUUID(),
          role: "user",
          content: formattedResults,
          timestamp: Date.now(),
          status: "sent",
          hidden: true,
        };

        const freshChat = useStore
          .getState()
          .chats.find((c) => c.id === chatId);
        if (!freshChat) {
          isSearchingRef.current = false;
          return;
        }

        // Phase4: Mark first running entry as done
        let foundRunning = false;
        const updatedMessages = freshChat.messages.map((m) =>
          m.id === toolMsgId
            ? {
                ...m,
                ...(isLastSearch !== false ? { status: "done" as const, searchPhase: "done" as const } : {}),
                toolCalls: (m.toolCalls || []).map((tc) => {
                  if (tc.tool === "web_search" && tc.status === "running" && !foundRunning) {
                    foundRunning = true;
                    return { ...tc, status: "done" as const };
                  }
                  return tc;
                }),
              }
            : m,
        );

        const withSearchResultsFinal = feedbackMsg 
          ? [...updatedMessages, resultsMsg, feedbackMsg]
          : [...updatedMessages, resultsMsg];
        // Ensure the tool message has content or toolCalls for the follow-up API call
        const toolIdx = withSearchResultsFinal.findIndex(m => m.id === toolMsgId);
        if (toolIdx >= 0) {
          const msg = withSearchResultsFinal[toolIdx];
          if (!msg.content && (!msg.toolCalls || msg.toolCalls.length === 0)) {
            withSearchResultsFinal[toolIdx] = { ...msg, content: "Searching..." };
          }
        }
        updateChat(chatId, { messages: withSearchResultsFinal });
        console.log("[BYTE] Phase 4 done:", foundRunning ? "marked done" : "no running entry", "| results:", searchResults.length);

        // Get provider/model for continuing
        let { provider, model } = resolveModel(providers, selectedModelId);

        if ((!provider || !model) && enabledModels.length > 0) {
          model = enabledModels[0];
          provider = providers.find((p) => p.id === model?.providerId) || null;
        }

        if (!provider || !model) {
          isSearchingRef.current = false;
          return;
        }

        // Only trigger follow-up AI stream for the last search in a batch
        // Earlier searches just complete silently — the last one triggers the AI response
        if (isLastSearch === false) {
          console.log("[BYTE] Intermediate search done, skipping follow-up");
          return;
        }

        // STREAM DIRECTLY INTO THE SAME MESSAGE (toolMsgId)
        console.log("[BYTE] Follow-up start, toolCalls done");
    if (streamingEnabled) {
      let followUpStreamStarted = false;
      const handle = streamChat(
            provider,
            model,
            withSearchResultsFinal,
            (chunk) => {
              const chat = useStore
                .getState()
                .chats.find((c) => c.id === chatId);
              if (!chat) return;
              const existingMsg = chat.messages.find((m) => m.id === toolMsgId);
              // Accumulate from rawContent (preserves tool_call JSON), not displayContent
              let accumulated: string;
              if (!followUpStreamStarted) {
                followUpStreamStarted = true;
                accumulated = chunk;
              } else {
                accumulated = (existingMsg?.rawContent || existingMsg?.content || "") + chunk;
              }

              // Detect web_search tool call during post-search streaming
              const hasNextFence =
                /```tool_calls?\b/.test(accumulated);
              const isSubtool = hasNextFence && /"subtool"\s*:/.test(accumulated);
              const displayContent = hasNextFence
                ? (isSubtool ? "" : commentaryBeforeFence(accumulated))
                : accumulated;

              updateChat(chatId, {
                messages: chat.messages.map((m) =>
                  m.id === toolMsgId
                    ? {
                        ...m,
                        content: displayContent,
                        rawContent: accumulated,
                        searchPhase: m.searchPhase,
                        toolCalls: m.toolCalls,
                      }
                    : m,
                ),
              });
            },
            () => {
              const chat = useStore
                .getState()
                .chats.find((c) => c.id === chatId);
              if (!chat) return;
              const existingMsg = chat.messages.find((m) => m.id === toolMsgId);
              const rawResponse =
                existingMsg?.rawContent || existingMsg?.content || "";

              // Check if follow-up response contains another web search
              const nextSearches = parseAllWebSearchTools(rawResponse);
              if (nextSearches.length > 0) {
                // Run the next search(es) — append to existing toolCalls
                const nextEntries: ToolCallEntry[] = nextSearches.map((ws) => ({
                  id: crypto.randomUUID(),
                  tool: "web_search" as const,
                  header: ws.header || ws.query,
                  params: { query: ws.query, count: ws.count, freshness: ws.freshness, fetch_urls: ws.fetch_urls, topic: ws.topic },
                  status: "running" as const,
                }));
                const commentary = extractToolCommentary(rawResponse, ["web_search", "news_search", "search"]) || "";

                updateChat(chatId, {
                  messages: chat.messages.map((m) =>
                    m.id === toolMsgId
                      ? {
                          ...m,
                          content: commentary,
                          rawContent: rawResponse,
                          toolCalls: [...(m.toolCalls || []), ...nextEntries],
                        }
                      : m,
                  ),
                });

                const runNextSearches = async () => {
                  for (let i = 0; i < nextSearches.length; i++) {
                    const currentMessages = useStore.getState().chats.find((c) => c.id === chatId)?.messages || chat.messages;
                    await handleWebSearchTool(chatId, toolMsgId, nextSearches[i], currentMessages, i === nextSearches.length - 1);
                    isSearchingRef.current = false;
                    if (i < nextSearches.length - 1) await new Promise(r => setTimeout(r, 2000));
                  }
                };
                runNextSearches().catch((err) => console.error("[BYTE] Follow-up search error:", err));
                return; // Don't mark as done — the next search will handle that
              }

              searchDepthRef.current = 0;
              let displayContent = rawResponse;
              updateChat(chatId, {
                messages: chat.messages.map((m) =>
                  m.id === toolMsgId
                    ? {
                        ...m,
                        ...existingMsg,
                        content: displayContent,
                        status: "done" as const,
                      }
                    : m,
                ),
              });
            },
            (error: Error) => {
              const chat = useStore
                .getState()
                .chats.find((c) => c.id === chatId);
              if (!chat) return;
              const existingMsg = chat.messages.find((m) => m.id === toolMsgId);
              updateChat(chatId, {
                messages: chat.messages.map((m) =>
                  m.id === toolMsgId
                    ? {
                        ...m,
                        ...existingMsg,
                        content: m.content || `Search error: ${error.message}`,
                        status: "error" as const,
                      }
                    : m,
                ),
              });
            },
            freshChat.config,
            memories,
            undefined,
            getProjectContext(lastUserMessage(withSearchResultsFinal)),
            undefined,
            !!effectiveLangSearchApiKey,
          );
          streamAbortRef.current = handle.abort;
        } else {
          const response = await sendChatMessage(
            provider,
            model,
            withSearchResultsFinal,
            undefined,
            freshChat.config,
            memories,
            undefined,
            getProjectContext(lastUserMessage(withSearchResultsFinal)),
            undefined,
            !!effectiveLangSearchApiKey,
          );
          const freshChat2 = useStore
            .getState()
            .chats.find((c) => c.id === chatId);
          if (!freshChat2) return;

          // Check if follow-up response contains another web search
          const nextSearches = parseAllWebSearchTools(response);
          if (nextSearches.length > 0) {
            const nextEntries: ToolCallEntry[] = nextSearches.map((ws) => ({
              id: crypto.randomUUID(),
              tool: "web_search" as const,
              header: ws.header || ws.query,
              params: { query: ws.query, count: ws.count, freshness: ws.freshness, fetch_urls: ws.fetch_urls, topic: ws.topic },
              status: "running" as const,
            }));
            const commentary = extractToolCommentary(response, ["web_search", "news_search", "search"]) || "";

            updateChat(chatId, {
              messages: freshChat2.messages.map((m) =>
                m.id === toolMsgId
                  ? { ...m, content: commentary, rawContent: response, toolCalls: [...(m.toolCalls || []), ...nextEntries] }
                  : m,
              ),
            });

            const runNextSearches = async () => {
              for (let i = 0; i < nextSearches.length; i++) {
                const currentMessages = useStore.getState().chats.find((c) => c.id === chatId)?.messages || freshChat2.messages;
                await handleWebSearchTool(chatId, toolMsgId, nextSearches[i], currentMessages, i === nextSearches.length - 1);
                isSearchingRef.current = false;
                if (i < nextSearches.length - 1) await new Promise(r => setTimeout(r, 2000));
              }
            };
            runNextSearches().catch((err) => console.error("[BYTE] Follow-up non-stream search error:", err));
          } else {
            searchDepthRef.current = 0;
            const existingMsg = freshChat2.messages.find(
              (m) => m.id === toolMsgId,
            );
            updateChat(chatId, {
              messages: withSearchResultsFinal.map((m) =>
                m.id === toolMsgId
                  ? {
                      ...m,
                      ...existingMsg,
                      content: response,
                      status: "done" as const,
                    }
                  : m,
              ),
            });
          }
        }
      } catch (err) {
        console.error("[BYTE] Web search failed:", err);
        searchDepthRef.current = 0;
        updateChat(chatId, {
          messages: currentMessages.map((m) =>
            m.id === toolMsgId
              ? {
                  ...m,
                  content: m.content || "Web search failed",
                  status: "error" as const,
                }
              : m,
          ),
        });
      } finally {
        clearTimeout(safetyTimeout);
        isSearchingRef.current = false;
      }
    },
    [
      langSearchApiKey,
      providers,
      selectedModelId,
      enabledModels,
      streamingEnabled,
      memories,
      updateChat,
    ],
  );

  const handleContinueFromAnswer = useCallback(async () => {
    if (!activeChatId) return;

    executedOpsRef.current.clear();

    // Get fresh chat data from store
    const currentChat = useStore
      .getState()
      .chats.find((c) => c.id === activeChatId);
    if (!currentChat) return;

    // Find provider and model, with fallback to first enabled model
    let { provider, model } = resolveModel(providers, selectedModelId);

    if ((!provider || !model) && enabledModels.length > 0) {
      model = enabledModels[0];
      provider = providers.find((p) => p.id === model?.providerId) || null;
    }

    if (!provider || !model) return;

    // Enable FILE_READ tool only if the chat is in a project with files
    const projectHasFiles = activeChatId && projects.some(
      (p) => p.chatIds.includes(activeChatId) && p.files.length > 0
    );
    const webSearchCanRun =
      model?.capabilities?.webSearch || !!effectiveLangSearchApiKey;
    const filteredTools = currentChat.config.enabledTools.filter(
      (t) => t !== "WEB_SEARCH" || webSearchCanRun
    );
    const effectiveConfig = projectHasFiles
      ? { ...currentChat.config, enabledTools: [...new Set([...filteredTools, "FILE_READ" as ToolId])] }
      : { ...currentChat.config, enabledTools: filteredTools };

    const assistantMsg: Message = {
      id: crypto.randomUUID(),
      role: "assistant",
      content: "",
      timestamp: Date.now(),
      status: "streaming",
    };

    updateChat(activeChatId, {
      messages: [...currentChat.messages, assistantMsg],
    });

    setIsLoading(true);

    if (streamingEnabled) {
      canvasParserRef.current = new StreamingCanvasParser();
      canvasChatBufferRef.current = '';
      const handle = streamChat(
        provider,
        model,
        currentChat.messages,
        (chunk) => {
          const chat = useStore
            .getState()
            .chats.find((c) => c.id === activeChatId);
          if (!chat) return;

          const existingMsg = chat.messages.find(
            (m) => m.id === assistantMsg.id,
          );
          const currentRaw =
            existingMsg?.rawContent || existingMsg?.content || "";
          const accumulatedContent = currentRaw + chunk;

          // Feed chunk to canvas parser, handle emitted events
          if (canvasParserRef.current) {
            const events = canvasParserRef.current.feed(chunk);
            for (const ev of events) {
              if (ev.type === 'chatChunk') {
                canvasChatBufferRef.current += ev.text;
              } else if (ev.type === 'canvasStart') {
                const newDoc: CanvasDocument = { id: ev.id, title: ev.title, lang: ev.lang, content: '', updatedAt: Date.now(), isStreaming: true };
                const curCanvas = useStore.getState().chats.find(c => c.id === activeChatId)?.canvasDocuments ?? [];
                updateChat(activeChatId, { canvasDocuments: [...curCanvas, newDoc] });
                updateChat(activeChatId, { activeCanvasId: ev.id });
              } else if (ev.type === 'canvasChunk') {
                const curCanvas = useStore.getState().chats.find(c => c.id === activeChatId)?.canvasDocuments ?? [];
                updateChat(activeChatId, { canvasDocuments: curCanvas.map(d => d.id === ev.id ? { ...d, content: d.content + ev.text, updatedAt: Date.now() } : d) });
              } else if (ev.type === 'canvasEnd') {
                const curCanvas = useStore.getState().chats.find(c => c.id === activeChatId)?.canvasDocuments ?? [];
                updateChat(activeChatId, { canvasDocuments: curCanvas.map(d => d.id === ev.id ? { ...d, isStreaming: false, updatedAt: Date.now() } : d) });
              }
            }
          }

          const chatBuffer = canvasChatBufferRef.current;
          const hasAnyFence =
            /```tool_calls?\b/.test(accumulatedContent);
          const isSubtool = hasAnyFence && /"subtool"\s*:/.test(accumulatedContent);

          const displayContent = hasAnyFence
            ? (isSubtool ? "" : commentaryBeforeFence(chatBuffer))
            : chatBuffer;

          updateChat(activeChatId, {
            messages: chat.messages.map((m) =>
              m.id === assistantMsg.id
                ? {
                    ...m,
                    content: displayContent,
                    rawContent: accumulatedContent,
                  }
                : m,
            ),
          });
        },
        () => {
          const chat = useStore
            .getState()
            .chats.find((c) => c.id === activeChatId);
          if (!chat) return;

          const lastMsg = chat.messages[chat.messages.length - 1];

          const askQuestion = lastMsg
            ? parseAskQuestionTool(lastMsg.rawContent || lastMsg.content)
            : null;
          const confirmAction = !askQuestion && lastMsg
            ? parseConfirmAction(lastMsg.rawContent || lastMsg.content)
            : null;
          const fileRead = !askQuestion && !confirmAction && lastMsg
            ? parseFileReadTool(lastMsg.rawContent || lastMsg.content)
            : null;
          const suggestMemory = !askQuestion && !confirmAction && !fileRead
            ? parseSuggestMemory(lastMsg?.rawContent || lastMsg?.content || "")
            : null;
          console.log("[CODE_EXEC] handler1 conditions — ask:", !!askQuestion, "confirm:", !!confirmAction, "file:", !!fileRead, "memory:", !!suggestMemory, "lastMsg:", !!lastMsg);
          const codeExec = !askQuestion && !confirmAction && !fileRead && !suggestMemory
            ? parseCodeExecutionTool(lastMsg?.rawContent || lastMsg?.content || "")
            : null;
          const webSearches =
            !askQuestion && !confirmAction && !fileRead && !suggestMemory && !codeExec
              ? parseAllWebSearchTools(lastMsg?.rawContent || lastMsg?.content || "")
              : [];
          if (webSearches.length > 0) console.log("[BYTE] Tool detected:", webSearches.map(w => ({ q: w.query.slice(0, 40), h: w.header })));

          const rawResponse = lastMsg?.rawContent || lastMsg?.content || "";

          // Finalize canvas parser — handles any unclosed canvas block
          if (canvasParserRef.current) {
            const finalEvents = canvasParserRef.current.finalize();
            for (const ev of finalEvents) {
              if (ev.type === 'chatChunk') {
                canvasChatBufferRef.current += ev.text;
              } else if (ev.type === 'canvasStart') {
                const newDoc: CanvasDocument = { id: ev.id, title: ev.title, lang: ev.lang, content: '', updatedAt: Date.now(), isStreaming: true };
                const curCanvas = useStore.getState().chats.find(c => c.id === activeChatId)?.canvasDocuments ?? [];
                updateChat(activeChatId, { canvasDocuments: [...curCanvas, newDoc] });
                updateChat(activeChatId, { activeCanvasId: ev.id });
              } else if (ev.type === 'canvasChunk') {
                const curCanvas = useStore.getState().chats.find(c => c.id === activeChatId)?.canvasDocuments ?? [];
                updateChat(activeChatId, { canvasDocuments: curCanvas.map(d => d.id === ev.id ? { ...d, content: d.content + ev.text, updatedAt: Date.now() } : d) });
              } else if (ev.type === 'canvasEnd') {
                const curCanvas = useStore.getState().chats.find(c => c.id === activeChatId)?.canvasDocuments ?? [];
                updateChat(activeChatId, { canvasDocuments: curCanvas.map(d => d.id === ev.id ? { ...d, isStreaming: false, updatedAt: Date.now() } : d) });
              }
            }
            canvasParserRef.current = null;
          }

          const chatBuffer = canvasChatBufferRef.current;
          canvasChatBufferRef.current = '';

          let displayContent = chatBuffer || rawResponse;
          if (askQuestion) {
            displayContent = extractToolCommentary(rawResponse, ["ask_question"]) || "";
          } else if (confirmAction) {
            displayContent = extractToolCommentary(rawResponse, ["confirm_action"]) || "";
          } else if (fileRead) {
            displayContent = extractToolCommentary(rawResponse, ["file_read"]) || "";
          } else if (suggestMemory) {
            displayContent = extractToolCommentary(rawResponse, ["suggest_memory"]) || "";
          } else if (codeExec) {
            displayContent = extractToolCommentary(rawResponse, ["code_execution"]) || "";
          } else if (webSearches.length > 0) {
            displayContent = extractToolCommentary(rawResponse, ["web_search", "news_search", "search"]) || "";
          }

          const hasAnyTool = askQuestion || confirmAction || fileRead || suggestMemory || codeExec || webSearches.length > 0;
          if (!hasAnyTool) {
            updateChat(activeChatId, {
              messages: chat.messages.map((m) =>
                m.id === assistantMsg.id
                  ? { ...m, content: displayContent, status: "done" as const }
                  : m,
              ),
            });
          } else {
            updateChat(activeChatId, {
              messages: chat.messages.map((m) =>
                m.id === assistantMsg.id
                  ? { ...m, content: displayContent, rawContent: rawResponse }
                  : m,
              ),
            });
          }

          if (askQuestion) {
            onAskQuestionDetected?.(askQuestion);
          }

          if (confirmAction) {
            handleConfirmAction(activeChatId, confirmAction.message);
          }

          if (fileRead) {
            handleFileReadTool(activeChatId, fileRead.path, fileRead.header);
          }

          if (codeExec) {
            handleCodeExecutionTool(activeChatId, codeExec);
          }

          if (suggestMemory) {
            window.dispatchEvent(
              new CustomEvent("byte:suggest-memory", { detail: suggestMemory }),
            );
          }

          if (webSearches.length > 0) {
            // Create tool call entries for all web searches
            const toolCallEntries: ToolCallEntry[] = webSearches.map((ws) => ({
              id: crypto.randomUUID(),
              tool: "web_search" as const,
              header: ws.header || ws.query,
              params: { query: ws.query, count: ws.count, freshness: ws.freshness, fetch_urls: ws.fetch_urls, topic: ws.topic },
              status: "running" as const,
            }));

            // Update message with all tool call entries
            updateChat(activeChatId, {
              messages: chat.messages.map((m) =>
                m.id === assistantMsg.id
                  ? { ...m, content: displayContent, status: "done" as const, toolCalls: toolCallEntries }
                  : m,
              ),
            });

            // Run searches sequentially — only last search triggers follow-up AI response
            const runSearches = async () => {
              for (let i = 0; i < webSearches.length; i++) {
                const currentMessages = useStore.getState().chats.find((c) => c.id === activeChatId)?.messages || chat.messages;
                await handleWebSearchTool(
                  activeChatId,
                  assistantMsg.id,
                  webSearches[i],
                  currentMessages,
                  i === webSearches.length - 1,
                );
                isSearchingRef.current = false;
                if (i < webSearches.length - 1) await new Promise(r => setTimeout(r, 2000));
              }
            };
            runSearches().catch((err) => console.error("[BYTE] Web search error:", err));
          }

          setIsLoading(false);
          streamAbortRef.current = null;
        },
        (error: Error) => {
          const chat = useStore
            .getState()
            .chats.find((c) => c.id === activeChatId);
          if (!chat) return;

          updateChat(activeChatId, {
            messages: chat.messages.map((m) =>
              m.id === assistantMsg.id
                ? {
                    ...m,
                    content: m.content || formatErrorContent(error),
                    status: "error" as const,
                  }
                : m,
            ),
          });
          setIsLoading(false);
          streamAbortRef.current = null;
        },
        effectiveConfig,
        memories,
        undefined,
        getProjectContext(lastUserMessage(currentChat.messages)),
      );
      streamAbortRef.current = handle.abort;
    } else {
      abortControllerRef.current = new AbortController();
      try {
        const response = await sendChatMessage(
          provider,
          model,
          currentChat.messages,
          abortControllerRef.current.signal,
          effectiveConfig,
          memories,
          undefined, // No simplified prompt for continue (not a slash command)
          getProjectContext(lastUserMessage(currentChat.messages)),
        );

        const askQuestion = parseAskQuestionTool(response);
        const confirmAction = !askQuestion ? parseConfirmAction(response) : null;
        const fileRead = !askQuestion && !confirmAction ? parseFileReadTool(response) : null;
        const codeExec = !askQuestion && !confirmAction && !fileRead ? parseCodeExecutionTool(response) : null;
        const webSearches = !askQuestion && !confirmAction && !fileRead && !codeExec ? parseAllWebSearchTools(response) : [];

        if (webSearches.length > 0) {
          const commentary = extractToolCommentary(response, ["web_search", "news_search", "search"]);
          const display = commentary || "";
          const toolCallEntries: ToolCallEntry[] = webSearches.map((ws) => ({
            id: crypto.randomUUID(),
            tool: "web_search" as const,
            header: ws.header || ws.query,
            params: { query: ws.query, count: ws.count, freshness: ws.freshness, fetch_urls: ws.fetch_urls },
            status: "running" as const,
          }));
          updateChat(activeChatId, {
            messages: currentChat.messages.map((m) =>
              m.id === assistantMsg.id
                ? { ...m, content: display, status: "done" as const, toolCalls: toolCallEntries }
                : m,
            ),
          });
          const runSearches = async () => {
            for (let i = 0; i < webSearches.length; i++) {
              const currentMessages = useStore.getState().chats.find((c) => c.id === activeChatId)?.messages || currentChat.messages;
              await handleWebSearchTool(activeChatId, assistantMsg.id, webSearches[i], currentMessages, i === webSearches.length - 1);
              isSearchingRef.current = false;
              if (i < webSearches.length - 1) await new Promise(r => setTimeout(r, 2000));
            }
          };
          runSearches().catch((err) => console.error("[BYTE] Web search error:", err));
        } else if (codeExec) {
          const rawCommentary = extractToolCommentary(response, ["code_execution"]) || ""
          const { content: cleanedCommentary, documents: newDocs } = parseCanvasBlocks(rawCommentary)
          const currentCanvas = chats.find(c => c.id === activeChatId)?.canvasDocuments ?? []
          const mergedDocs = [...currentCanvas]
          for (const doc of newDocs) {
            const idx = mergedDocs.findIndex(d => d.title === doc.title)
            if (idx >= 0) { mergedDocs[idx] = doc } else { mergedDocs.push(doc) }
          }
          updateChat(activeChatId, {
            messages: [
              ...currentChat.messages,
              { ...assistantMsg, content: cleanedCommentary, status: "done" as const },
            ],
            canvasDocuments: mergedDocs,
          });
          handleCodeExecutionTool(activeChatId, codeExec);
        } else if (fileRead) {
          const rawCommentary = extractToolCommentary(response, ["file_read"]) || ""
          const { content: cleanedCommentary, documents: newDocs } = parseCanvasBlocks(rawCommentary)
          const currentCanvas = chats.find(c => c.id === activeChatId)?.canvasDocuments ?? []
          const mergedDocs = [...currentCanvas]
          for (const doc of newDocs) {
            const idx = mergedDocs.findIndex(d => d.title === doc.title)
            if (idx >= 0) { mergedDocs[idx] = doc } else { mergedDocs.push(doc) }
          }
          updateChat(activeChatId, {
            messages: [
              ...currentChat.messages,
              { ...assistantMsg, content: cleanedCommentary, status: "done" as const },
            ],
            canvasDocuments: mergedDocs,
          });
          handleFileReadTool(activeChatId, fileRead.path, fileRead.header);
        } else {
          const { content: cleanedContent, documents: newDocs } = parseCanvasBlocks(response)
          const currentCanvas = chats.find(c => c.id === activeChatId)?.canvasDocuments ?? []
          const mergedDocs = [...currentCanvas]
          for (const doc of newDocs) {
            const idx = mergedDocs.findIndex(d => d.title === doc.title)
            if (idx >= 0) { mergedDocs[idx] = doc } else { mergedDocs.push(doc) }
          }
          updateChat(activeChatId, {
            messages: [
              ...currentChat.messages,
              { ...assistantMsg, content: cleanedContent, status: "done" as const },
            ],
            canvasDocuments: mergedDocs,
          });
          if (askQuestion) {
            onAskQuestionDetected?.(askQuestion);
          }
          if (confirmAction) {
            handleConfirmAction(activeChatId, confirmAction.message);
          }
        }
      } catch (error) {
        if (error instanceof Error && error.name !== "AbortError") {
          updateChat(activeChatId, {
            messages: [
              ...currentChat.messages,
              {
                ...assistantMsg,
                content: formatErrorContent(error),
                status: "error" as const,
              },
            ],
          });
        }
      } finally {
        setIsLoading(false);
        abortControllerRef.current = null;
      }
    }
  }, [
    activeChatId,
    providers,
    selectedModelId,
    enabledModels,
    streamingEnabled,
    memories,
    updateChat,
    onAskQuestionDetected,
    projects,
  ]);

  // Parse ask_question tool from assistant response
  // Format 1: {"tool":"ask_question","questions":[...]}
  // Format 2: {"question":"...?","type":"...?","options":[...]} (raw question without tool wrapper)
  const parseAskQuestionTool = (content: string): AskQuestionPayload | null => {
    // Reject obviously invalid content early
    if (!content || content.trim().length < 10) return null;

    // Strip escaped backticks and tool_call wrappers that models sometimes add
    let cleaned = content
      .replace(/\\```[\w-]*\n?/g, "")
      .replace(/```[\w-]*\n?/g, "")
      .trim();

    // Reject content that looks like an error message
    if (
      cleaned.startsWith("ERROR:") ||
      cleaned.startsWith("Error:") ||
      cleaned.startsWith("error")
    ) {
      return null;
    }

    try {
      // First try: Find JSON object with "tool":"ask_question"
      const jsonMatch = cleaned.match(
        /\{[\s\S]*"tool"\s*:\s*"ask_question"[\s\S]*\}/,
      );
      if (jsonMatch) {
        const payload = JSON.parse(jsonMatch[0]);
        if (
          payload.tool === "ask_question" &&
          payload.questions &&
          Array.isArray(payload.questions)
        ) {
          return normalizePayload(payload);
        }
      }

      // Fallback: Try to detect raw question object without tool wrapper
      // e.g., {"question":"...?","type":"...?","options":[...]}
      // Only match if we have a proper JSON structure
      const rawMatch = cleaned.match(
        /\{[\s\S]*"question"\s*:\s*"[^"]{3,}"[\s\S]*\}/,
      );
      if (rawMatch) {
        try {
          const rawPayload = JSON.parse(rawMatch[0]);
          // Validate: must have question string and either options array or known type
          if (
            rawPayload.question &&
            typeof rawPayload.question === "string" &&
            rawPayload.question.length > 2 &&
            rawPayload.question.length < 500 &&
            (Array.isArray(rawPayload.options) ||
              rawPayload.type === "text" ||
              rawPayload.type === "short_text" ||
              rawPayload.type === "slider" ||
              rawPayload.type === "single_select" ||
              rawPayload.type === "multi_select" ||
              rawPayload.type === "rank")
          ) {
            // Wrap it as an ask_question payload
            return normalizePayload({
              tool: "ask_question",
              questions: [rawPayload],
            });
          }
        } catch {
          // Continue to return null
        }
      }
    } catch {
      // Not a valid ask_question tool, continue
    }
    return null;
  };

  // Normalize payload to AskQuestionPayload
  const normalizePayload = (payload: any): AskQuestionPayload | null => {
    if (!payload) return null;

    let questions = payload.questions || payload.fields || [];

    // Validate we have actual questions
    if (!Array.isArray(questions) || questions.length === 0) {
      return null;
    }

    // Filter out invalid questions
    questions = questions.filter(
      (q: any) =>
        q &&
        typeof q.question === "string" &&
        q.question.length > 2 &&
        q.question.length < 500,
    );

    if (questions.length === 0) {
      return null;
    }

    // If it's a single question (not wrapped in array)
    if (
      questions.length === 0 &&
      payload.question &&
      typeof payload.question === "string"
    ) {
      questions = [
        {
          id: payload.id || "main-question",
          type: payload.type || "single_select",
          question: payload.question,
          options: payload.options,
          show_if: payload.show_if,
          min: payload.min,
          max: payload.max,
          placeholder: payload.placeholder,
        },
      ];
    }

    // Normalize question objects
    const normalizedQuestions = questions.map((q: any) => {
      // Normalize type: "multiple_choice" -> "single_select"
      let type = q.type || "text";
      if (type === "multiple_choice") type = "single_select";
      if (type === "multiple") type = "multi_select";

      return {
        id: q.id || q.name || crypto.randomUUID(),
        question: q.question || q.label || "",
        type,
        options: q.options,
        show_if: q.show_if,
        min: q.min,
        max: q.max,
        label: q.label,
        placeholder: q.placeholder,
      };
    });

    if (normalizedQuestions.length > 0) {
      return {
        tool: "ask_question",
        questions: normalizedQuestions,
        comment: payload.comment,
      };
    }
    return null;
  };

  const executeCodeInSandbox = (code: string, language: string): Promise<{ output: string; error?: string }> => {
    return new Promise((resolve) => {
      if (language !== "javascript" && language !== "js") {
        resolve({ output: "", error: `Language '${language}' is not supported. Only JavaScript is currently supported.` });
        return;
      }
      const html = `<!DOCTYPE html><html><body><script>
        const logs = [];
        console.log = (...a) => logs.push(a.map(x => typeof x === 'object' ? JSON.stringify(x, null, 2) : String(x)).join(' '));
        console.error = (...a) => logs.push('[ERROR] ' + a.map(x => String(x)).join(' '));
        console.warn = (...a) => logs.push('[WARN] ' + a.map(x => String(x)).join(' '));
        try { eval(${JSON.stringify(code)}); window.parent.postMessage({ type: 'done', output: logs.join('\\n') }, '*'); }
        catch(e) { window.parent.postMessage({ type: 'error', output: logs.join('\\n'), error: e.message }, '*'); }
      <\/script></body></html>`;
      const blob = new Blob([html], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      const iframe = document.createElement("iframe");
      iframe.style.display = "none";
      iframe.setAttribute("sandbox", "allow-scripts");
      iframe.src = url;
      let done = false;
      const timer = setTimeout(() => {
        if (done) return;
        done = true;
        cleanup();
        resolve({ output: "", error: "Code execution timed out (10s limit)" });
      }, 10000);
      const cleanup = () => {
        clearTimeout(timer);
        window.removeEventListener("message", handler);
        if (iframe.parentNode) document.body.removeChild(iframe);
        URL.revokeObjectURL(url);
      };
      const handler = (event: MessageEvent) => {
        if (event.source !== iframe.contentWindow) return;
        if (done) return;
        done = true;
        cleanup();
        if (event.data.type === "done") resolve({ output: event.data.output || "" });
        else resolve({ output: event.data.output || "", error: event.data.error });
      };
      window.addEventListener("message", handler);
      document.body.appendChild(iframe);
    });
  };

  interface CodeExecutionParams {
    language: string;
    code: string;
    header?: string;
  }

  const parseCodeExecutionTool = (content: string): CodeExecutionParams | null => {
    console.log("[CODE_EXEC parse] called, length:", content?.length, "| preview:", content?.slice(0, 120));
    if (!content || content.trim().length < 10) return null;
    const cleaned = content.replace(/\\```[\w-]*\n?/g, "").replace(/```[\w-]*\n?/g, "").trim();
    console.log("[CODE_EXEC parse] cleaned:", cleaned);
    try {
      const jsonMatch = cleaned.match(/\{[\s\S]*"tool"\s*:\s*"code_execution"[\s\S]*\}/);
      console.log("[CODE_EXEC parse] jsonMatch:", jsonMatch);
      if (jsonMatch) {
        const payload = JSON.parse(jsonMatch[0]);
        if (payload.tool === "code_execution" && payload.code) {
          return { language: payload.language || "javascript", code: payload.code, header: payload.header };
        }
      }
    } catch (e) { console.log("[CODE_EXEC parse] error:", e); }
    return null;
  };

  const handleCodeExecutionTool = useCallback(async (chatId: string, params: CodeExecutionParams) => {
    const chat = useStore.getState().chats.find((c) => c.id === chatId);
    if (!chat) return;
    const lastMsg = chat.messages[chat.messages.length - 1];
    if (!lastMsg || lastMsg.role !== "assistant") return;

    const toolCallEntry: ToolCallEntry = {
      id: crypto.randomUUID(),
      tool: "code_execution",
      header: params.header || `Running ${params.language}`,
      params: { language: params.language, code: params.code },
      status: "running" as const,
    };

    updateChat(chatId, {
      messages: chat.messages.map((m) =>
        m.id === lastMsg.id ? { ...m, toolCalls: [...(m.toolCalls || []), toolCallEntry] } : m,
      ),
    });

    const result = await executeCodeInSandbox(params.code, params.language);
    const output = result.error
      ? `Error: ${result.error}${result.output ? `\n\nOutput before error:\n${result.output}` : ""}`
      : result.output || "(no output)";

    const freshChat = useStore.getState().chats.find((c) => c.id === chatId);
    if (!freshChat) return;

    updateChat(chatId, {
      messages: freshChat.messages.map((m) =>
        m.id === lastMsg.id
          ? {
              ...m,
              toolCalls: (m.toolCalls || []).map((tc) =>
                tc.id === toolCallEntry.id
                  ? { ...tc, status: (result.error ? "error" : "done") as "error" | "done", result: output }
                  : tc,
              ),
            }
          : m,
      ),
    });

    const freshChat2 = useStore.getState().chats.find((c) => c.id === chatId);
    if (!freshChat2) return;

    const resultMsg: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: `Code execution result:\n\`\`\`\n${output}\n\`\`\``,
      timestamp: Date.now(),
      status: "sent",
      hidden: true,
    };
    const messagesWithResult = [...freshChat2.messages, resultMsg];
    updateChat(chatId, { messages: messagesWithResult });

    // Trigger follow-up stream so AI can respond with a structured answer
    const state = useStore.getState();
    let { provider, model } = resolveModel(state.providers, state.selectedModelId);
    if (!provider || !model) return;

    const chatConfig = freshChat2.config;
    const memories = state.memories;
    const langSearchAvailable = state.langSearchEnabled ? state.langSearchApiKey : "";

    let followUpStarted = false;
    streamChat(
      provider,
      model,
      messagesWithResult,
      (chunk) => {
        const currentChat = useStore.getState().chats.find(c => c.id === chatId);
        if (!currentChat) return;
        let accumulated: string;
        if (!followUpStarted) {
          followUpStarted = true;
          accumulated = chunk;
        } else {
          const existingMsg = currentChat.messages.find(m => m.id === lastMsg.id);
          accumulated = (existingMsg?.rawContent || existingMsg?.content || "") + chunk;
        }
        const hasAnyFence = /```tool_calls?\b/.test(accumulated);
        const displayContent = hasAnyFence ? commentaryBeforeFence(accumulated) : accumulated;
        updateChat(chatId, {
          messages: currentChat.messages.map(m =>
            m.id === lastMsg.id
              ? { ...m, content: displayContent, rawContent: accumulated, toolCalls: m.toolCalls }
              : m
          ),
        });
      },
      () => {
        const currentChat = useStore.getState().chats.find(c => c.id === chatId);
        if (!currentChat) return;
        const existingMsg = currentChat.messages.find(m => m.id === lastMsg.id);
        const rawResponse = existingMsg?.rawContent || existingMsg?.content || "";
        updateChat(chatId, {
          messages: currentChat.messages.map(m =>
            m.id === lastMsg.id
              ? { ...m, content: rawResponse, rawContent: rawResponse, status: "done" as const, toolCalls: m.toolCalls }
              : m
          ),
        });
      },
      (error) => { console.error("[CODE_EXEC] Follow-up error:", error); },
      chatConfig,
      memories,
      null,
      undefined,
      undefined,
      !!langSearchAvailable,
    );
  }, [updateChat, commentaryBeforeFence]);

  // Parse confirm_action tool from assistant response
  const parseConfirmAction = (content: string): { tool: string; message: string } | null => {
    if (!content || content.trim().length < 10) return null;
    const cleaned = content
      .replace(/\\```[\w-]*\n?/g, "")
      .replace(/```[\w-]*\n?/g, "")
      .trim();
    try {
      const jsonMatch = cleaned.match(
        /\{[\s\S]*"tool"\s*:\s*"confirm_action"[\s\S]*\}/,
      );
      if (jsonMatch) {
        const payload = JSON.parse(jsonMatch[0]);
        if (payload.tool === "confirm_action") {
          return { tool: "confirm_action", message: payload.message || "" };
        }
      }
    } catch { /* ignore */ }
    return null;
  };

  interface FileReadParams {
    path: string;
    header?: string;
  }

  const parseFileReadTool = (content: string): FileReadParams | null => {
    if (!content || content.trim().length < 10) return null;
    let cleaned = content
      .replace(/\\```[\w-]*\n?/g, "")
      .replace(/```[\w-]*\n?/g, "")
      .trim();
    try {
      let jsonMatch = cleaned.match(/\{[\s\S]*\\?"tool\\?"\s*:\s*\\?"file_read\\?"[\s\S]*\}/);
      if (!jsonMatch) {
        jsonMatch = cleaned.match(/\{[\s\S]*"tool"\s*:\s*"file_read"[\s\S]*\}/);
      }
      if (!jsonMatch) {
        jsonMatch = cleaned.match(/\{[\s\S]*\"tool\"\s*:\s*\"file_read\"[\s\S]*\}/);
      }
      if (jsonMatch) {
        let jsonStr = jsonMatch[0].replace(/\\"/g, '"');
        const payload = JSON.parse(jsonStr);
        if (payload.tool === "file_read") {
          const filePath = payload.path || payload.filename || payload.file;
          if (filePath) {
            return { path: filePath, header: payload.header };
          }
        }
      }
    } catch {}
    return null;
  };

  const handleFileReadTool = useCallback(async (chatId: string, path: string, header?: string) => {
    const chat = useStore.getState().chats.find((c) => c.id === chatId);
    if (!chat) return;
    const project = projects.find((p) => p.chatIds.includes(chatId));
    if (!project) return;
    const file = project.files.find((f) => f.name === path || f.name.toLowerCase() === path.toLowerCase());
    if (!file) return;
    const cached = projectFileContentsRef.current[file.id];
    if (!cached) return;

    const lastMsg = chat.messages[chat.messages.length - 1];
    if (!lastMsg || lastMsg.role !== "assistant") return;

    const ext = file.name.split(".").pop() || "text";
    const fileContent = `\`\`\`${ext}\n${cached}\n\`\`\``;
    const freshChat = useStore.getState().chats.find((c) => c.id === chatId);
    if (!freshChat) return;

    const toolCallEntry: ToolCallEntry = {
      id: crypto.randomUUID(),
      tool: "file_read",
      header: header || `Reading ${file.name}`,
      params: { path },
      status: "done",
      result: cached.length > 500 ? cached.slice(0, 500) + "..." : cached,
    };

    updateChat(chatId, {
      messages: freshChat.messages.map((m) =>
        m.id === lastMsg.id
          ? {
              ...m,
              fileReadResult: fileContent,
              fileReadFileName: file.name,
              fileReadPhase: "done" as const,
              status: "done" as const,
              toolCalls: [...(m.toolCalls || []), toolCallEntry],
            }
          : m,
      ),
    });
  }, [projects, updateChat]);

  // Handle confirm_action by re-sending with confirmation
  const handleConfirmAction = useCallback(async (chatId: string, _message: string) => {
    const chat = useStore.getState().chats.find((c) => c.id === chatId);
    if (!chat) return;
    // Append a confirmation message so the AI proceeds
    const confirmMsg: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: "Confirmed. Please proceed.",
      timestamp: Date.now(),
      status: "sent",
    };
    updateChat(chatId, { messages: [...chat.messages, confirmMsg] });
  }, [updateChat]);

  // Parse suggest_memory tool from assistant response
  const parseSuggestMemory = (
    content: string,
  ): { name: string; content: string } | null => {
    if (!content || content.trim().length < 10) return null;
    // Strip escaped backticks and tool_call wrappers
    let cleaned = content
      .replace(/\\```[\w-]*\n?/g, "")
      .replace(/```[\w-]*\n?/g, "")
      .trim();
    try {
      const jsonMatch = cleaned.match(
        /\{[\s\S]*"tool"\s*:\s*"suggest_memory"[\s\S]*\}/,
      );
      if (jsonMatch) {
        const payload = JSON.parse(jsonMatch[0]);
        if (
          payload.tool === "suggest_memory" &&
          payload.name &&
          payload.content
        ) {
          return { name: payload.name, content: payload.content };
        }
      }
    } catch {}
    return null;
  };

  const handleSend = useCallback(
    async (text: string, attachments?: ImageAttachment[]) => {
      if (!activeChatId || !text.trim()) return;

      // Reset operation dedup set for this new send
      executedOpsRef.current.clear();

      // Check if this is a slash command and get simplified prompt (skips MAIN.md + tools to save tokens)
      const { systemPrompt: simplifiedSystemPrompt } = getSlashCommandPrompt(
        text.trim(),
      );

      // Find provider and model, with fallback to first enabled model
      let { provider, model } = resolveModel(providers, selectedModelId);

      // Fallback to first enabled model if no selection or selection not found
      if ((!provider || !model) && enabledModels.length > 0) {
        model = enabledModels[0];
        provider = providers.find((p) => p.id === model?.providerId) || null;
      }

      if (!provider || !model) {
        // No model configured — add error message
        const errorMsg: Message = {
          id: crypto.randomUUID(),
          role: "system",
          content:
            "No model selected. Please add an API key in Settings and select a model.",
          timestamp: Date.now(),
          status: "error",
        };
        updateChat(activeChatId, {
          messages: [...(chat?.messages || []), errorMsg],
        });
        return;
      }

      // Enable FILE_READ tool only if the chat is in a project with files
      const projectHasFiles = activeChatId && projects.some(
        (p) => p.chatIds.includes(activeChatId) && p.files.length > 0
      );
      const webSearchCanRun =
        model?.capabilities?.webSearch || !!effectiveLangSearchApiKey;
      const baseTools = (chat?.config?.enabledTools || []).filter(
        (t) => t !== "WEB_SEARCH" || webSearchCanRun
      );
      const effectiveConfig = projectHasFiles && chat?.config
        ? { ...chat.config, enabledTools: [...new Set([...baseTools, "FILE_READ" as ToolId])] }
        : chat?.config ? { ...chat.config, enabledTools: baseTools } : chat?.config;

      // DEBUG: Log everything being sent to the API
      // Handle describe-mode and OCR-mode attachments
      let processedAttachments = attachments;
      const hasDescribe = attachments?.some((a) => a.mode === "describe");
      const hasOCR = attachments?.some((a) => a.mode === "ocr");

      const genId = () => crypto.randomUUID();
      const userMsg: Message = { id: genId(), role: "user", content: text.trim(), timestamp: Date.now(), status: "sent", attachments };
      const assistantMsg: Message = { id: genId(), role: "assistant", content: "", rawContent: "", timestamp: Date.now(), status: "streaming" };

      if (hasOCR) {
        assistantMsg.ocrPhase = "extracting";
        assistantMsg.toolCalls = [{
          id: crypto.randomUUID(),
          tool: "ocr",
          header: "Extracting text from images",
          params: { attachments: attachments?.filter(a => a.mode === "ocr").map(a => a.fileName) },
          status: "running" as const,
        }];
        updateChat(activeChatId, {
          messages: [...(chat?.messages || []), userMsg, assistantMsg],
          title: chat?.title === "New chat" ? text.trim().slice(0, 50) : chat?.title,
        });
      }

      // Process describe/OCR attachments
      if (hasDescribe || hasOCR) {
        if (hasDescribe && !hasOCR) {
          const describingMsg: Message = { id: genId(), role: "assistant", content: "Analyzing images...", rawContent: "", timestamp: Date.now(), status: "streaming", describePhase: "describing" };
          updateChat(activeChatId, { messages: [...(chat?.messages || []), describingMsg] });
        }

        const ocrResults: { text: string }[] = [];

        processedAttachments = await Promise.all(
          attachments!.map(async (attachment) => {
            if (attachment.mode === "describe") {
              try {
                const description = await describeImage(provider, model, attachment.dataUri, attachment.mimeType);
                return { ...attachment, description, describedBy: model.name || model.id };
              } catch { return attachment; }
            }
            if (attachment.mode === "ocr") {
              if (!ocrEnabled) { console.warn("[BYTE] OCR requested but not enabled"); return attachment; }
              try {
                const imgAtt = attachment as ImageAttachment;

                // Multi-page PDF OCR (lazy rendering)
                if (imgAtt.pdfData && imgAtt.totalPages && imgAtt.totalPages > 0) {
                  const { pdfData, ...imgAttNoPdf } = imgAtt;
                  const { renderPdfPages } = await import("../../lib/fileConverter");

                  // Re-create a File-like Blob from the stored PDF data
                  const pdfBlob = await (await fetch(imgAtt.pdfData)).blob();
                  const pdfFile = new File([pdfBlob], imgAtt.fileName, { type: "application/pdf" });

                  const pages = await renderPdfPages(pdfFile);
                  const pageTexts: string[] = [];

                  for (let i = 0; i < pages.length; i++) {
                    // Update progress message
                    const progressChat = useStore.getState().chats.find((c) => c.id === activeChatId);
                    if (progressChat) {
                      updateChat(activeChatId, {
                        messages: progressChat.messages.map((m) =>
                          m.id === assistantMsg.id
                            ? { ...m, content: `Extracting Text - ${i + 1}/${pages.length}` }
                            : m
                        ),
                      });
                    }

                    const text = await extractTextOCR(pages[i].dataUri, () => {});
                    pageTexts.push(text);
                  }

                  // Update OCR phase message with results
                  const currentChat = useStore.getState().chats.find((c) => c.id === activeChatId);
                  if (currentChat) {
                    const progressText = pageTexts.map((t, i) => `--- Page ${i + 1} ---\n${t}`).join("\n\n");
                    updateChat(activeChatId, {
                      messages: currentChat.messages.map((m) =>
                        m.id === assistantMsg.id
                          ? {
                              ...m, ocrPhase: "done" as const, ocrText: progressText, content: "",
                              toolCalls: (m.toolCalls || []).map(tc =>
                                tc.tool === "ocr" ? { ...tc, status: "done" as const, result: progressText.slice(0, 300) } : tc
                              ),
                            }
                          : m
                      ),
                    });
                  }

                  const fullText = pageTexts.map((t, i) => `--- Page ${i + 1} ---\n${t}`).join("\n\n");
                  ocrResults.push({ text: fullText });
                  return { ...imgAttNoPdf, description: fullText, describedBy: "Tesseract OCR" } as ImageAttachment;
                }

                // Single image OCR
                const extractedText = await extractTextOCR(attachment.dataUri, () => {});
                ocrResults.push({ text: extractedText });
                return { ...attachment, description: extractedText, describedBy: "Tesseract OCR" };
              } catch { return attachment; }
            }
            return attachment;
          }),
        );

        if (hasOCR) {
          const ocrText = ocrResults.map((r) => r.text).join("\n\n─────────────────────\n\n");
          const fresh = useStore.getState().chats.find((c) => c.id === activeChatId);
          if (fresh) {
            updateChat(activeChatId, {
              messages: fresh.messages.map((m) =>
                m.id === assistantMsg.id
                  ? { ...m, status: "done" as const, ocrPhase: "done" as const, ocrText,
                      toolCalls: (m.toolCalls || []).map(tc =>
                        tc.tool === "ocr" ? { ...tc, status: "done" as const, result: ocrText.slice(0, 300) } : tc
                      ),
                    }
                : m.id === userMsg.id
                  ? { ...m, attachments: processedAttachments }
                  : m
              ),
            });
          }
        } else {
          // Describe only — remove interstitial
          updateChat(activeChatId, { messages: chat?.messages || [] });
        }
      }

      const newMessages = hasOCR
        ? (useStore.getState().chats.find((c) => c.id === activeChatId)?.messages || [])
        : [...(chat?.messages || []), userMsg, assistantMsg];
      const title = chat?.title === "New chat" ? text.trim().slice(0, 50) : chat?.title;

      if (!hasOCR) {
        updateChat(activeChatId, { messages: newMessages, title });
      }

      setIsLoading(true);
      console.log("[BYTE] Send:", text.trim().slice(0, 80));

      if (streamingEnabled) {
        canvasParserRef.current = new StreamingCanvasParser();
        canvasChatBufferRef.current = '';
        // Use streaming - update message content as chunks arrive
        const handle = streamChat(
          provider,
          model,
          newMessages.slice(0, -1),
          (chunk) => {
            // Get current messages from store to avoid stale closure
            const currentChat = useStore
              .getState()
              .chats.find((c) => c.id === activeChatId);
            if (!currentChat) return;

            // IMPORTANT: Accumulate from rawContent, not content
            // content may have display text like "Asking Question..." which would corrupt accumulation
            const existingMsg = currentChat.messages.find(
              (m) => m.id === assistantMsg.id,
            );
            const currentRaw =
              existingMsg?.rawContent || existingMsg?.content || "";
            const accumulatedContent = currentRaw + chunk;

            // Feed chunk to canvas parser, handle emitted events
            if (canvasParserRef.current) {
              const events = canvasParserRef.current.feed(chunk);
              for (const ev of events) {
                if (ev.type === 'chatChunk') {
                  canvasChatBufferRef.current += ev.text;
                } else if (ev.type === 'canvasStart') {
                  const newDoc: CanvasDocument = { id: ev.id, title: ev.title, lang: ev.lang, content: '', updatedAt: Date.now(), isStreaming: true };
                  const curCanvas = useStore.getState().chats.find(c => c.id === activeChatId)?.canvasDocuments ?? [];
                  updateChat(activeChatId, { canvasDocuments: [...curCanvas, newDoc], activeCanvasId: ev.id });
                } else if (ev.type === 'canvasChunk') {
                  const curCanvas = useStore.getState().chats.find(c => c.id === activeChatId)?.canvasDocuments ?? [];
                  updateChat(activeChatId, { canvasDocuments: curCanvas.map(d => d.id === ev.id ? { ...d, content: d.content + ev.text, updatedAt: Date.now() } : d) });
                } else if (ev.type === 'canvasEnd') {
                  const curCanvas = useStore.getState().chats.find(c => c.id === activeChatId)?.canvasDocuments ?? [];
                  updateChat(activeChatId, { canvasDocuments: curCanvas.map(d => d.id === ev.id ? { ...d, isStreaming: false, updatedAt: Date.now() } : d) });
                }
              }
            }

            const chatBuffer = canvasChatBufferRef.current;
            // Detect tool fence to strip display content — keeps full rawContent for tool parsing
            const hasAnyFence = /```tool_calls?\b/.test(accumulatedContent);
            const isSubtool = hasAnyFence && /"subtool"\s*:/.test(accumulatedContent);
            const displayContent = hasAnyFence
              ? (isSubtool ? "" : commentaryBeforeFence(chatBuffer))
              : chatBuffer;

            updateChat(activeChatId, {
              messages: currentChat.messages.map((m) =>
                m.id === assistantMsg.id
                  ? {
                      ...m,
                      content: displayContent,
                      rawContent: accumulatedContent,
                    }
                  : m,
              ),
            });
          },
          () => {
            const currentChat = useStore
              .getState()
              .chats.find((c) => c.id === activeChatId);
            if (!currentChat) return;

            const lastMsg =
              currentChat.messages[currentChat.messages.length - 1];

            const askQuestion = lastMsg
              ? parseAskQuestionTool(lastMsg.rawContent || lastMsg.content)
              : null;
            const confirmAction = !askQuestion && lastMsg
              ? parseConfirmAction(lastMsg.rawContent || lastMsg.content)
              : null;
            const fileRead = !askQuestion && !confirmAction && lastMsg
              ? parseFileReadTool(lastMsg.rawContent || lastMsg.content)
              : null;
            const suggestMemory = !askQuestion && !confirmAction && !fileRead
              ? parseSuggestMemory(
                  lastMsg?.rawContent || lastMsg?.content || "",
                )
              : null;
            const codeExec2 = !askQuestion && !confirmAction && !fileRead && !suggestMemory
              ? parseCodeExecutionTool(lastMsg?.rawContent || lastMsg?.content || "")
              : null;
            const webSearches =
              !askQuestion && !confirmAction && !fileRead && !suggestMemory && !codeExec2
                ? parseOperations(lastMsg?.rawContent || lastMsg?.content || "")
                : [];

            const rawResponse = lastMsg?.rawContent || lastMsg?.content || "";

            // Finalize canvas parser
            if (canvasParserRef.current) {
              const finalEvents = canvasParserRef.current.finalize();
              for (const ev of finalEvents) {
                if (ev.type === 'chatChunk') {
                  canvasChatBufferRef.current += ev.text;
                } else if (ev.type === 'canvasStart') {
                  const newDoc: CanvasDocument = { id: ev.id, title: ev.title, lang: ev.lang, content: '', updatedAt: Date.now(), isStreaming: true };
                  const curCanvas = useStore.getState().chats.find(c => c.id === activeChatId)?.canvasDocuments ?? [];
                  updateChat(activeChatId, { canvasDocuments: [...curCanvas, newDoc], activeCanvasId: ev.id });
                } else if (ev.type === 'canvasChunk') {
                  const curCanvas = useStore.getState().chats.find(c => c.id === activeChatId)?.canvasDocuments ?? [];
                  updateChat(activeChatId, { canvasDocuments: curCanvas.map(d => d.id === ev.id ? { ...d, content: d.content + ev.text, updatedAt: Date.now() } : d) });
                } else if (ev.type === 'canvasEnd') {
                  const curCanvas = useStore.getState().chats.find(c => c.id === activeChatId)?.canvasDocuments ?? [];
                  updateChat(activeChatId, { canvasDocuments: curCanvas.map(d => d.id === ev.id ? { ...d, isStreaming: false, updatedAt: Date.now() } : d) });
                }
              }
              canvasParserRef.current = null;
            }

            const chatBuffer = canvasChatBufferRef.current;
            canvasChatBufferRef.current = '';

            console.log("[CODE_EXEC] rawResponse:", rawResponse.slice(0, 200));
            console.log("[CODE_EXEC] codeExec2:", codeExec2);
            let displayContent = chatBuffer || rawResponse;
            if (askQuestion) {
              displayContent = extractToolCommentary(rawResponse, ["ask_question"]) || "";
            } else if (confirmAction) {
              displayContent = extractToolCommentary(rawResponse, ["confirm_action"]) || "";
            } else if (fileRead) {
              displayContent = extractToolCommentary(rawResponse, ["file_read"]) || "";
            } else if (suggestMemory) {
              displayContent = extractToolCommentary(rawResponse, ["suggest_memory"]) || "";
            } else if (codeExec2) {
              displayContent = extractToolCommentary(rawResponse, ["code_execution"]) || "";
            } else if (webSearches.length > 0) {
              displayContent = extractToolCommentary(rawResponse, ["web_search", "news_search", "search"]) || "";
            }

            console.log("[HANDLE_SEND] onDone: webSearches=%d askQuestion=%s fileRead=%s", webSearches.length, !!askQuestion, !!fileRead);
            if (webSearches.length > 0) {
              console.log("[HANDLE_SEND] First op:", webSearches[0].type, "header:", webSearches[0].header);
              // Update message with commentary
              updateChat(activeChatId, {
                messages: currentChat.messages.map((m) =>
                  m.id === assistantMsg.id
                    ? { ...m, content: displayContent }
                    : m,
                ),
              });

              // Store remaining ops in case the follow-up doesn't produce more
              pendingOpsRef.current = webSearches.slice(1);
              console.log("[HANDLE_SEND] Stored %d pending operations", pendingOpsRef.current.length);

              // Process ONE operation — follow-up handles the rest
              console.log("[HANDLE_SEND] Calling executeOneOp with first operation");
              executeOneOp(activeChatId, assistantMsg.id, webSearches[0], currentChat.messages)
                .catch(err => console.error("[BYTE] Operation error:", err));
            } else {
              if (askQuestion) {
                onAskQuestionDetected?.(askQuestion);
              }
              if (confirmAction) {
                handleConfirmAction(activeChatId, confirmAction.message);
              }
              if (fileRead) {
                handleFileReadTool(activeChatId, fileRead.path, fileRead.header);
              }
              if (codeExec2) {
                handleCodeExecutionTool(activeChatId, codeExec2);
              }
              if (suggestMemory) {
                window.dispatchEvent(
                  new CustomEvent("byte:suggest-memory", {
                    detail: suggestMemory,
                  }),
                );
              }
              const freshChat = useStore.getState().chats.find(c => c.id === activeChatId) || currentChat;
              updateChat(activeChatId, {
                messages: freshChat.messages.map((m) =>
                  m.id === assistantMsg.id
                    ? { ...m, content: displayContent, status: "done" as const }
                    : m,
                ),
              });
            }

            setIsLoading(false);
            streamAbortRef.current = null;
          },
          (error) => {
            const currentChat = useStore
              .getState()
              .chats.find((c) => c.id === activeChatId);
            if (!currentChat) return;

            updateChat(activeChatId, {
              messages: currentChat.messages.map((m) =>
                m.id === assistantMsg.id
                  ? {
                      ...m,
                      content: m.content || formatErrorContent(error),
                      status: "error" as const,
                    }
                  : m,
              ),
            });
            setIsLoading(false);
            streamAbortRef.current = null;
          },
          effectiveConfig, // Pass chat config for prompt assembly
          memories, // Pass memories for context
          simplifiedSystemPrompt, // Use simplified prompt for slash commands (null for normal messages)
          getProjectContext(text),
          processedAttachments, // Pass image attachments
        );
        streamAbortRef.current = handle.abort;
      } else {
        // Use non-streaming
        abortControllerRef.current = new AbortController();
        try {
          const response = await sendChatMessage(
            provider,
            model,
            newMessages.slice(0, -1),
            abortControllerRef.current.signal,
            effectiveConfig, // Pass chat config for prompt assembly
            memories, // Pass memories for context
            simplifiedSystemPrompt, // Use simplified prompt for slash commands (null for normal messages)
            getProjectContext(text),
            processedAttachments, // Pass image attachments
          );

          const askQuestion = parseAskQuestionTool(response);
          const confirmAction = !askQuestion ? parseConfirmAction(response) : null;
          const fileRead = !askQuestion && !confirmAction ? parseFileReadTool(response) : null;
          const codeExec = !askQuestion && !confirmAction && !fileRead ? parseCodeExecutionTool(response) : null;
          const suggestMemory = !askQuestion && !confirmAction && !fileRead && !codeExec
            ? parseSuggestMemory(response)
            : null;
          const webSearches =
            !askQuestion && !confirmAction && !fileRead && !codeExec && !suggestMemory
              ? parseAllWebSearchTools(response)
              : [];

          let displayContent = response;
          if (askQuestion) {
            displayContent = extractToolCommentary(response, ["ask_question"]) || "";
          } else if (confirmAction) {
            displayContent = extractToolCommentary(response, ["confirm_action"]) || "";
          } else if (fileRead) {
            displayContent = extractToolCommentary(response, ["file_read"]) || "";
          } else if (codeExec) {
            displayContent = extractToolCommentary(response, ["code_execution"]) || "";
          } else if (suggestMemory) {
            displayContent = extractToolCommentary(response, ["suggest_memory"]) || "";
          } else if (webSearches.length > 0) {
            displayContent = extractToolCommentary(response, ["web_search", "news_search", "search"]) || "";
          }

          if (webSearches.length > 0) {
            const toolCallEntries: ToolCallEntry[] = webSearches.map((ws) => ({
              id: crypto.randomUUID(),
              tool: "web_search" as const,
              header: ws.header || ws.query,
              params: { query: ws.query, count: ws.count, freshness: ws.freshness, fetch_urls: ws.fetch_urls },
              status: "running" as const,
            }));
            const updatedMessages = newMessages.map((m) =>
              m.id === assistantMsg.id
                ? { ...m, content: displayContent, status: "done" as const, toolCalls: toolCallEntries }
                : m,
            );
            updateChat(activeChatId, { messages: updatedMessages });
            const runSearches = async () => {
              for (let i = 0; i < webSearches.length; i++) {
                const currentMessages = useStore.getState().chats.find((c) => c.id === activeChatId)?.messages || updatedMessages;
                await handleWebSearchTool(activeChatId, assistantMsg.id, webSearches[i], currentMessages, i === webSearches.length - 1);
                isSearchingRef.current = false;
                if (i < webSearches.length - 1) await new Promise(r => setTimeout(r, 2000));
              }
            };
            runSearches().catch((err) => console.error("[BYTE] Web search error:", err));
          } else {
            const updatedMessages = newMessages.map((m) =>
              m.id === assistantMsg.id
                ? { ...m, content: displayContent, status: "done" as const }
                : m,
            );
            updateChat(activeChatId, { messages: updatedMessages });
            if (askQuestion) {
              onAskQuestionDetected?.(askQuestion);
            } else if (confirmAction) {
              handleConfirmAction(activeChatId, confirmAction.message);
            } else if (codeExec) {
              handleCodeExecutionTool(activeChatId, codeExec);
            } else if (fileRead) {
              handleFileReadTool(activeChatId, fileRead.path, fileRead.header);
            }
          }

          if (suggestMemory) {
            window.dispatchEvent(
              new CustomEvent("byte:suggest-memory", { detail: suggestMemory }),
            );
          }
        } catch (error) {
          if (error instanceof Error && error.name === "AbortError") {
            updateChat(activeChatId, {
              messages: newMessages.map((m) =>
                m.id === assistantMsg.id
                  ? {
                      ...m,
                      content: m.content || "Stopped",
                      status: "done" as const,
                    }
                  : m,
              ),
            });
          } else {
            updateChat(activeChatId, {
              messages: newMessages.map((m) =>
                m.id === assistantMsg.id
                  ? {
                      ...m,
                      content: formatErrorContent(error),
                      status: "error" as const,
                    }
                  : m,
              ),
            });
          }
        } finally {
          setIsLoading(false);
          abortControllerRef.current = null;
        }
      }
    },
    [
      activeChatId,
      chat?.messages,
      chat?.title,
      providers,
      selectedModelId,
      enabledModelIds,
      streamingEnabled,
      memories,
      updateChat,
      projects,
      handleFileReadTool,
    ],
  );

  // Listen for new chat messages from HomeView
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as {
        text: string;
        chatId: string;
        attachments?: ImageAttachment[];
      };
      if (detail?.text && detail?.chatId) {
        if (detail.chatId === activeChatId) {
          handleSend(detail.text, detail.attachments);
        }
      }
    };
    window.addEventListener("byte:new-chat-message", handler);
    return () => window.removeEventListener("byte:new-chat-message", handler);
  }, [activeChatId, handleSend]);

  // Listen for continue-chat event (from AskQuestion answers)
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as { chatId: string };
      if (detail?.chatId && detail.chatId === activeChatId) {
        // The answer message is already in the chat - just trigger AI response
        // Get the latest messages which should include the answer
        const currentChat = useStore
          .getState()
          .chats.find((c) => c.id === activeChatId);
        if (!currentChat || currentChat.messages.length === 0) return;

        // Find the last user message (the answer)
        const lastMsg = currentChat.messages[currentChat.messages.length - 1];
        if (lastMsg?.role === "user") {
          handleContinueFromAnswer();
        }
      }
    };
    window.addEventListener("byte:continue-chat", handler);
    return () => window.removeEventListener("byte:continue-chat", handler);
  }, [activeChatId, handleContinueFromAnswer]);

  // Generate AI title after first meaningful exchange
  useEffect(() => {
    if (!chat || !activeChatId) return;
    if (titleGeneratedRef.current.has(activeChatId)) return;
    if (chat.messages.length < 2) return;

    const lastMsg = chat.messages[chat.messages.length - 1];
    if (lastMsg.role !== "assistant" || lastMsg.status !== "done") return;

    const displayContent = lastMsg.content || "";
    if (
      displayContent.startsWith("Asking Question") ||
      displayContent.startsWith("Searching the web") ||
      displayContent === "Suggesting memory..."
    )
      return;

    titleGeneratedRef.current.add(activeChatId);

    const { provider, model } = resolveModel(providers, selectedModelId);
    if (!provider || !model) return;

    const firstUserMsg = chat.messages.find((m) => m.role === "user");
    const firstAssistantMsg = [...chat.messages]
      .reverse()
      .find((m) => m.role === "assistant" && m.status === "done");
    if (!firstUserMsg) return;

    const titleMsgs = [
      { role: "user", content: firstUserMsg.content.slice(0, 300) },
    ];
    if (firstAssistantMsg) {
      titleMsgs.push({
        role: "assistant",
        content: firstAssistantMsg.content.slice(0, 300),
      });
    }

    generateChatTitle(provider, model, titleMsgs)
      .then((title) => {
        if (title && title.trim()) {
          updateChat(activeChatId, { title: title.trim() });
        }
      })
      .catch(() => {
        // Silently fail, keep existing title
      });
  }, [
    chat?.messages[chat.messages.length - 1]?.status,
    chat?.messages.length,
    activeChatId,
    providers,
    selectedModelId,
    updateChat,
  ]);

  if (!chat) {
    return (
      <div className="view on" style={{ flexDirection: "column" }}>
        <div className="home-stage">
          <div className="home-name">No chat selected</div>
          <div className="home-sub">Start a new chat from the sidebar</div>
        </div>
      </div>
    );
  }

  return (
    <div className="view on" style={{ flexDirection: 'row', overflow: 'hidden' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
      <div className="chat-msgs" ref={chatMsgsRef} onScroll={handleScroll}>
        <div className="chat-msgs-inner">
          <CanvasContext.Provider value={{ documents: canvasDocuments, onOpen: handleCanvasOpen }}>
            {chat.messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} />
            ))}
          </CanvasContext.Provider>
          <div ref={messagesEndRef} />
        </div>
      </div>
      {!activeAskQuestion && !activeSuggestMemory && (
        <div className="chat-in">
          {showScrollButton && (
            <button
              onClick={scrollToBottom}
              className="scroll-to-bottom-btn"
              title="Scroll to bottom"
              aria-label="Scroll to bottom"
            >
              ↓
            </button>
          )}
          <InputBox
            variant="chat"
            onSend={handleSend}
            isStreaming={isLoading}
            onStop={handleStop}
            responseStyle={chat?.config?.responseStyle}
            onStyleChange={handleStyleChange}
            memoryEnabled={chat?.config?.memoryEnabled}
            onMemoryToggle={handleMemoryToggle}
            webSearchEnabled={webSearchEnabled}
            onWebSearchToggle={handleWebSearchToggle}
            codeExecutionEnabled={codeExecutionEnabled}
            onCodeExecutionToggle={handleCodeExecutionToggle}
          />
        </div>
      )}
      </div>
      {activeCanvasId && canvasDocuments.length > 0 && (
        <CanvasPanel
          documents={canvasDocuments}
          activeId={activeCanvasId}
          onSetActive={handleCanvasTabSwitch}
          onClose={handleCanvasClose}
        />
      )}
    </div>
  );
}
