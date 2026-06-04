import { useCallback, useState, useRef, useEffect } from "react";
import { Copy } from "lucide-react";
import { useStore } from "../../store/useStore";
import type { Message } from "../../types";
import { InputBox } from "../shared/InputBox";
import { sendChatMessage, resolveModel } from "../../lib/api";
import { getDefaultChatConfig } from "../../lib/prompts";

export function NewChatView() {
  const { providers, selectedModelId, activeProjectId, setActiveProjectId, defaultCodeExecutionEnabled } = useStore();

  // Clear active project when entering new chat page
  useEffect(() => {
    if (activeProjectId) setActiveProjectId(null);
  }, []);
  const [isLoading, setIsLoading] = useState(false);
  const [codeExecutionEnabled, setCodeExecutionEnabled] = useState(() => defaultCodeExecutionEnabled);
  const abortControllerRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const handleStop = useCallback(() => {
    abortControllerRef.current?.abort();
    setIsLoading(false);
    abortControllerRef.current = null;
  }, []);

  const handleSend = useCallback(
    async (text: string) => {
      if (!text.trim()) return;

      const chatId = currentChatId || crypto.randomUUID();
      if (!currentChatId) setCurrentChatId(chatId);

      const { provider, model } = resolveModel(providers, selectedModelId);

      if (!provider || !model) {
        const errorMsg: Message = {
          id: crypto.randomUUID(),
          role: "system",
          content:
            "No model selected. Please add an API key in Settings and select a model.",
          timestamp: Date.now(),
          status: "error",
        };
        setMessages((prev) => [...prev, errorMsg]);
        return;
      }

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

      const newMessages = [...messages, userMsg, assistantMsg];
      setMessages(newMessages);

      setIsLoading(true);
      abortControllerRef.current = new AbortController();

      try {
        const chatConfig = getDefaultChatConfig();
        if (codeExecutionEnabled) {
          chatConfig.enabledTools = [...chatConfig.enabledTools, "CODE_EXECUTION" as const];
        }
        const response = await sendChatMessage(
          provider,
          model,
          newMessages.slice(0, -1),
          abortControllerRef.current.signal,
          chatConfig,
        );

        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMsg.id
              ? { ...m, content: response, status: "done" as const }
              : m,
          ),
        );
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          // Request was aborted
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMsg.id
                ? {
                    ...m,
                    content: m.content || "Stopped",
                    status: "done" as const,
                  }
                : m,
            ),
          );
        } else {
          const errorMessage =
            error instanceof Error ? error.message : "Unknown error occurred";
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMsg.id
                ? {
                    ...m,
                    content: `Error: ${errorMessage}`,
                    status: "error" as const,
                  }
                : m,
            ),
          );
        }
      } finally {
        setIsLoading(false);
        abortControllerRef.current = null;
      }
    },
    [messages, currentChatId, providers, selectedModelId],
  );

  return (
    <div className="view on" style={{ flexDirection: "column" }}>
      <div className="chat-msgs">
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}
        <div ref={messagesEndRef} />
      </div>
      <div className="chat-in">
        <InputBox
          variant="chat"
          onSend={handleSend}
          isStreaming={isLoading}
          onStop={handleStop}
          codeExecutionEnabled={codeExecutionEnabled}
          onCodeExecutionToggle={setCodeExecutionEnabled}
        />
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: Message }) {
  if (message.role === "system") {
    return (
      <div className="msg" style={{ justifyContent: "center" }}>
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

  const isUser = message.role === "user";

  return (
    <div className={`msg${isUser ? " u" : ""}`}>
      {!isUser && <div className="msg-av ai">B</div>}
      <div className="msg-body">
        {!isUser && (
          <div className="msg-meta">Byte · {formatTime(message.timestamp)}</div>
        )}
        <div className="msg-txt">{message.content}</div>
        <div className="msg-acts">
          <button className="msg-act" title="Copy">
            <Copy size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}
