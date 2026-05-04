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
} from "../../lib/api";
import { getSlashCommandPrompt } from "../../lib/slashCommands";

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
    projects,
  } = useStore();
  const effectiveLangSearchApiKey = langSearchEnabled ? langSearchApiKey : "";
  const [isLoading, setIsLoading] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const streamAbortRef = useRef<(() => void) | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isSearchingRef = useRef(false);
  const titleGeneratedRef = useRef<Set<string>>(new Set());
  const chat = chats.find((c) => c.id === activeChatId);

  // Build project context for AI prompts
  const getProjectContext = useCallback(() => {
    if (!activeChatId) return undefined;
    const project = projects.find((p) => p.chatIds.includes(activeChatId));
    if (!project) return undefined;
    const parts: string[] = [];
    if (project.customInstructions) {
      parts.push(
        `<project_context>\n<project_name>${project.name}</project_name>`,
      );
      parts.push(
        `<custom_instructions>\n${project.customInstructions}\n</custom_instructions>`,
      );
    }
    if (project.files.length > 0) {
      parts.push(
        `<project_files>\n${project.files.map((f) => `- ${f.name} (${(f.size / 1024).toFixed(1)} KB)`).join("\n")}\n</project_files>`,
      );
    }
    if (parts.length > 0) {
      parts.push("</project_context>");
      return parts.join("\n");
    }
    return undefined;
  }, [activeChatId, projects]);

  // Get enabled models for fallback
  const enabledModels = providers.flatMap((p) =>
    p.models.filter((m) => enabledModelIds.includes(makeModelKey(p.id, m.id))),
  );

  const messagesLength = chat?.messages.length ?? 0;
  const lastContent = chat?.messages[messagesLength - 1]?.content;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
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
    topic?: string;
    count?: number;
    freshness?: string;
    fetch_urls?: number[];
  }

  const parseWebSearchTool = (content: string): WebSearchParams | null => {
    if (!content || content.trim().length < 10) return null;
    let cleaned = content.replace(/```[\w-]*\n?/g, "").trim();
    try {
      const jsonMatch = cleaned.match(
        /\{[\s\S]*"tool"\s*:\s*"(?:web_search|news_search|search)"[\s\S]*\}/,
      );
      if (jsonMatch) {
        const payload = JSON.parse(jsonMatch[0]);
        if (payload.query && typeof payload.query === "string") {
          return {
            query: payload.query,
            topic: payload.topic,
            count: payload.count,
            freshness: payload.freshness,
            fetch_urls: payload.fetch_urls,
          };
        }
      }
    } catch {}
    return null;
  };

  // Format search results for AI context (snippets only, no summaries)
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

  const handleWebSearchTool = useCallback(
    async (
      chatId: string,
      toolMsgId: string,
      params: WebSearchParams,
      currentMessages: Message[],
    ) => {
      if (isSearchingRef.current) return;
      isSearchingRef.current = true;
      try {
        console.log("[BYTE] Searching:", params.query);

        // Phase 1: Show searching state
        updateChat(chatId, {
          messages: currentMessages.map((m) =>
            m.id === toolMsgId
              ? {
                  ...m,
                  content: "Searching the web...",
                  searchPhase: "searching" as const,
                }
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

        // Phase 2: Show all searched results immediately
        const allSources = searchResults.map((r) => ({
          url: r.url,
          title: r.name || r.displayUrl,
        }));
        updateChat(chatId, {
          messages: currentMessages.map((m) =>
            m.id === toolMsgId
              ? {
                  ...m,
                  content: "",
                  searchPhase: "fetching" as const,
                  webSearchSources: allSources,
                }
              : m,
          ),
        });

        const indicesToFetch = params.fetch_urls?.length
          ? params.fetch_urls.filter((i) => i >= 0 && i < searchResults.length)
          : [0, 1].filter((i) => i < searchResults.length);

        const jinaResults: string[] = [];
        const fetchedSources: { url: string; title: string }[] = [];
        for (const i of indicesToFetch) {
          console.log("[BYTE] Fetching page:", searchResults[i].url);
          try {
            const content = await fetchPageWithJina(searchResults[i].url);
            jinaResults.push(
              `--- Full content from ${searchResults[i].url} ---\n${content.slice(0, 3000)}`,
            );
            fetchedSources.push({
              url: searchResults[i].url,
              title: searchResults[i].name || searchResults[i].displayUrl,
            });

            // Phase 3: Update with each successful fetch in real-time
            const freshChat = useStore
              .getState()
              .chats.find((c) => c.id === chatId);
            if (freshChat) {
              const currentToolMsg = freshChat.messages.find(
                (m) => m.id === toolMsgId,
              );
              const existingFetched = currentToolMsg?.webSearchFetched || [];
              updateChat(chatId, {
                messages: freshChat.messages.map((m) =>
                  m.id === toolMsgId
                    ? {
                        ...m,
                        webSearchFetched: [
                          ...existingFetched,
                          {
                            url: searchResults[i].url,
                            title:
                              searchResults[i].name ||
                              searchResults[i].displayUrl,
                          },
                        ],
                      }
                    : m,
                ),
              });
            }
          } catch {
            console.log("[BYTE] Jina blocked or failed:", searchResults[i].url);
          }
        }

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

        // Phase 4: Mark as done
        const updatedMessages = freshChat.messages.map((m) =>
          m.id === toolMsgId
            ? {
                ...m,
                content: "",
                status: "done" as const,
                searchPhase: "done" as const,
              }
            : m,
        );

        const withSearchResults = [...updatedMessages, resultsMsg];

        updateChat(chatId, { messages: withSearchResults });

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

        // STREAM DIRECTLY INTO THE SAME MESSAGE (toolMsgId)
        if (streamingEnabled) {
          const handle = streamChat(
            provider,
            model,
            withSearchResults,
            (chunk) => {
              const chat = useStore
                .getState()
                .chats.find((c) => c.id === chatId);
              if (!chat) return;
              const existingMsg = chat.messages.find((m) => m.id === toolMsgId);
              const currentRaw = existingMsg?.rawContent || "";
              const accumulated = currentRaw + chunk;
              updateChat(chatId, {
                messages: chat.messages.map((m) =>
                  m.id === toolMsgId
                    ? {
                        ...m,
                        ...existingMsg,
                        content: accumulated,
                        rawContent: accumulated,
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
              let displayContent =
                existingMsg?.rawContent || existingMsg?.content || "";
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
            getProjectContext(),
          );
          streamAbortRef.current = handle.abort;
        } else {
          const response = await sendChatMessage(
            provider,
            model,
            withSearchResults,
            undefined,
            freshChat.config,
            memories,
            undefined,
            getProjectContext(),
          );
          const freshChat2 = useStore
            .getState()
            .chats.find((c) => c.id === chatId);
          const existingMsg = freshChat2?.messages.find(
            (m) => m.id === toolMsgId,
          );
          updateChat(chatId, {
            messages: withSearchResults.map((m) =>
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
      } catch (err) {
        console.error("[BYTE] Web search failed:", err);
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

          const isAskQuestion =
            accumulatedContent.includes('"tool":"ask_question"') ||
            accumulatedContent.includes('"tool": "ask_question"');

          const isSuggestMemory =
            accumulatedContent.includes('"tool":"suggest_memory"') ||
            accumulatedContent.includes('"tool": "suggest_memory"');

          const isWebSearch =
            /"tool"\s*:\s*"(web_search|news_search|search)"/.test(
              accumulatedContent,
            );

          let displayContent = accumulatedContent;
          if (isWebSearch) displayContent = "Searching the web...";
          else if (isAskQuestion) displayContent = "Asking Question...";
          else if (isSuggestMemory) displayContent = "Suggesting memory...";

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
          console.log(
            "[BYTE DEBUG] AI returned:",
            lastMsg?.rawContent || lastMsg?.content,
          );

          const askQuestion = lastMsg
            ? parseAskQuestionTool(lastMsg.rawContent || lastMsg.content)
            : null;
          const suggestMemory = !askQuestion
            ? parseSuggestMemory(lastMsg?.rawContent || lastMsg?.content || "")
            : null;
          const webSearch =
            !askQuestion && !suggestMemory
              ? parseWebSearchTool(
                  lastMsg?.rawContent || lastMsg?.content || "",
                )
              : null;

          let displayContent = "Asking Question...";
          if (suggestMemory) {
            displayContent = "Suggesting memory...";
          } else if (webSearch) {
            displayContent = "Searching the web...";
          } else if (!askQuestion) {
            displayContent = lastMsg?.rawContent || lastMsg?.content || "";
          }

          updateChat(activeChatId, {
            messages: chat.messages.map((m) =>
              m.id === assistantMsg.id
                ? { ...m, content: displayContent, status: "done" as const }
                : m,
            ),
          });

          if (askQuestion) {
            onAskQuestionDetected?.(askQuestion);
          }

          if (suggestMemory) {
            window.dispatchEvent(
              new CustomEvent("byte:suggest-memory", { detail: suggestMemory }),
            );
          }

          if (webSearch) {
            handleWebSearchTool(
              activeChatId,
              assistantMsg.id,
              webSearch,
              chat.messages,
            ).catch((err) => console.error("[BYTE] Web search error:", err));
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
                    content: m.content || `Error: ${error.message}`,
                    status: "error" as const,
                  }
                : m,
            ),
          });
          setIsLoading(false);
          streamAbortRef.current = null;
        },
        currentChat.config,
        memories,
        undefined,
        getProjectContext(),
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
          currentChat.config,
          memories,
          undefined, // No simplified prompt for continue (not a slash command)
          getProjectContext(),
        );

        const updatedMessages = [
          ...currentChat.messages,
          { ...assistantMsg, content: response, status: "done" as const },
        ];

        const askQuestion = parseAskQuestionTool(response);
        const webSearch = !askQuestion ? parseWebSearchTool(response) : null;

        if (webSearch) {
          let display = "Searching the web...";
          updateChat(activeChatId, {
            messages: currentChat.messages.map((m) =>
              m.id === assistantMsg.id
                ? { ...m, content: display, status: "done" as const }
                : m,
            ),
          });
          handleWebSearchTool(
            activeChatId,
            assistantMsg.id,
            webSearch,
            updatedMessages,
          ).catch((err) => console.error("[BYTE] Web search error:", err));
        } else {
          updateChat(activeChatId, {
            messages: [
              ...currentChat.messages,
              { ...assistantMsg, content: response, status: "done" as const },
            ],
          });
          if (askQuestion) {
            onAskQuestionDetected?.(askQuestion);
          }
        }
      } catch (error) {
        if (error instanceof Error && error.name !== "AbortError") {
          const errorMessage =
            error instanceof Error ? error.message : "Unknown error occurred";
          updateChat(activeChatId, {
            messages: [
              ...currentChat.messages,
              {
                ...assistantMsg,
                content: `Error: ${errorMessage}`,
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
  ]);

  // Parse ask_question tool from assistant response
  // Format 1: {"tool":"ask_question","questions":[...]}
  // Format 2: {"question":"...?","type":"...?","options":[...]} (raw question without tool wrapper)
  const parseAskQuestionTool = (content: string): AskQuestionPayload | null => {
    // Reject obviously invalid content early
    if (!content || content.trim().length < 10) return null;

    // Reject content that looks like an error message
    if (
      content.startsWith("ERROR:") ||
      content.startsWith("Error:") ||
      content.startsWith("error")
    ) {
      return null;
    }

    try {
      // First try: Find JSON object with "tool":"ask_question"
      const jsonMatch = content.match(
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
      const rawMatch = content.match(
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

  // Parse suggest_memory tool from assistant response
  const parseSuggestMemory = (
    content: string,
  ): { name: string; content: string } | null => {
    if (!content || content.trim().length < 10) return null;
    try {
      const jsonMatch = content.match(
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
    async (text: string) => {
      if (!activeChatId || !text.trim()) return;

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

      // DEBUG: Log everything being sent to the API
      console.group("[BYTE DEBUG] Sending message");
      console.log("User message:", text.trim());
      console.log("Is slash command:", !!simplifiedSystemPrompt);
      console.log(
        "System prompt:",
        simplifiedSystemPrompt ||
          "[Using full assembled prompt from chat config]",
      );
      console.log("Chat config:", chat?.config);
      console.log("Enabled tools:", chat?.config?.enabledTools);
      console.log("Memories enabled:", chat?.config?.memoryEnabled);
      console.log("Memories:", memories);
      console.log("Model:", model?.id);
      console.log("Provider:", provider?.id);
      console.groupEnd();

      const userMsg: Message = {
        id: crypto.randomUUID(),
        role: "user",
        content: text.trim(),
        timestamp: Date.now(),
        status: "sent",
      };

      const assistantMsg: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: "",
        timestamp: Date.now(),
        status: "streaming",
      };

      const newMessages = [...(chat?.messages || []), userMsg, assistantMsg];
      updateChat(activeChatId, {
        messages: newMessages,
        title:
          chat?.title === "New chat" ? text.trim().slice(0, 50) : chat?.title,
      });

      setIsLoading(true);

      if (streamingEnabled) {
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

            // Check if this looks like an ask_question tool call
            // Only match the specific "tool":"ask_question" pattern - avoid false positives
            const isAskQuestion =
              accumulatedContent.includes('"tool":"ask_question"') ||
              accumulatedContent.includes('"tool": "ask_question"');

            const isSuggestMemory =
              accumulatedContent.includes('"tool":"suggest_memory"') ||
              accumulatedContent.includes('"tool": "suggest_memory"');

            const isWebSearch =
              /"tool"\s*:\s*"(web_search|news_search|search)"/.test(
                accumulatedContent,
              );

            let displayContent = accumulatedContent;
            if (isWebSearch) displayContent = "Searching the web...";
            else if (isAskQuestion) displayContent = "Asking Question...";
            else if (isSuggestMemory) displayContent = "Suggesting memory...";

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

            // DEBUG: Log exact raw AI response (not display content)
            console.log(
              "[BYTE DEBUG] AI returned:",
              lastMsg?.rawContent || lastMsg?.content,
            );

            const askQuestion = lastMsg
              ? parseAskQuestionTool(lastMsg.rawContent || lastMsg.content)
              : null;
            const suggestMemory = !askQuestion
              ? parseSuggestMemory(
                  lastMsg?.rawContent || lastMsg?.content || "",
                )
              : null;
            const webSearch =
              !askQuestion && !suggestMemory
                ? parseWebSearchTool(
                    lastMsg?.rawContent || lastMsg?.content || "",
                  )
                : null;

            // If this is an ask_question message, show "Asking Question..." instead of the raw JSON
            let displayContent = "Asking Question...";
            if (suggestMemory) {
              displayContent = "Suggesting memory...";
            } else if (webSearch) {
              displayContent = "Searching the web...";
            } else if (!askQuestion) {
              displayContent = lastMsg?.rawContent || lastMsg?.content || "";
            }

            updateChat(activeChatId, {
              messages: currentChat.messages.map((m) =>
                m.id === assistantMsg.id
                  ? { ...m, content: displayContent, status: "done" as const }
                  : m,
              ),
            });

            if (askQuestion) {
              onAskQuestionDetected?.(askQuestion);
            }

            if (suggestMemory) {
              window.dispatchEvent(
                new CustomEvent("byte:suggest-memory", {
                  detail: suggestMemory,
                }),
              );
            }

            if (webSearch) {
              handleWebSearchTool(
                activeChatId,
                assistantMsg.id,
                webSearch,
                currentChat.messages,
              ).catch((err) => console.error("[BYTE] Web search error:", err));
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
                      content: m.content || `Error: ${error.message}`,
                      status: "error" as const,
                    }
                  : m,
              ),
            });
            setIsLoading(false);
            streamAbortRef.current = null;
          },
          chat?.config, // Pass chat config for prompt assembly
          memories, // Pass memories for context
          simplifiedSystemPrompt, // Use simplified prompt for slash commands (null for normal messages)
          getProjectContext(),
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
            chat?.config, // Pass chat config for prompt assembly
            memories, // Pass memories for context
            simplifiedSystemPrompt, // Use simplified prompt for slash commands (null for normal messages)
            getProjectContext(),
          );

          const askQuestion = parseAskQuestionTool(response);
          const suggestMemory = !askQuestion
            ? parseSuggestMemory(response)
            : null;
          const webSearch =
            !askQuestion && !suggestMemory
              ? parseWebSearchTool(response)
              : null;

          let displayContent = response;
          if (webSearch) displayContent = "Searching the web...";
          else if (askQuestion) displayContent = "Asking Question...";
          else if (suggestMemory) displayContent = "Suggesting memory...";

          const updatedMessages = newMessages.map((m) =>
            m.id === assistantMsg.id
              ? { ...m, content: displayContent, status: "done" as const }
              : m,
          );

          updateChat(activeChatId, {
            messages: updatedMessages,
          });

          if (webSearch) {
            handleWebSearchTool(
              activeChatId,
              assistantMsg.id,
              webSearch,
              updatedMessages,
            ).catch((err) => console.error("[BYTE] Web search error:", err));
          } else if (askQuestion) {
            onAskQuestionDetected?.(askQuestion);
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
            const errorMessage =
              error instanceof Error ? error.message : "Unknown error occurred";
            updateChat(activeChatId, {
              messages: newMessages.map((m) =>
                m.id === assistantMsg.id
                  ? {
                      ...m,
                      content: `Error: ${errorMessage}`,
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
    ],
  );

  // Listen for new chat messages from HomeView
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as {
        text: string;
        chatId: string;
      };
      if (detail?.text && detail?.chatId) {
        if (detail.chatId === activeChatId) {
          handleSend(detail.text);
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
    <div className="view on" style={{ flexDirection: "column" }}>
      <div className="chat-msgs">
        <div className="chat-msgs-inner">
          {chat.messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} />
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>
      {!activeAskQuestion && !activeSuggestMemory && (
        <div className="chat-in">
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
          />
        </div>
      )}
    </div>
  );
}
