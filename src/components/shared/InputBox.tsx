import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { Mic, Send, ChevronDown, Square, Folder, X } from "lucide-react";
import { useStore } from "../../store/useStore";
import { getDisplayName } from "../../lib/api";
import { PlusMenu } from "./PlusMenu";
import { ModelPicker } from "./ModelPicker";
import { SlashCommandMenu } from "./SlashCommandMenu";
import type { SlashCommand } from "./SlashCommandMenu";
import type { ResponseStyleId } from "../../types";

interface InputBoxProps {
  variant: "home" | "chat";
  onSend: (text: string) => void;
  isStreaming?: boolean;
  onStop?: () => void;
  value?: string;
  onChange?: (value: string) => void;
  responseStyle?: ResponseStyleId;
  onStyleChange?: (style: ResponseStyleId) => void;
  memoryEnabled?: boolean;
  onMemoryToggle?: (enabled: boolean) => void;
  webSearchEnabled?: boolean;
  onWebSearchToggle?: (enabled: boolean) => void;
}

export function InputBox({
  variant,
  onSend,
  isStreaming,
  onStop,
  value: externalValue,
  onChange,
  responseStyle = "normal",
  onStyleChange,
  memoryEnabled = false,
  onMemoryToggle,
  webSearchEnabled: extWebSearchEnabled,
  onWebSearchToggle,
}: InputBoxProps) {
  const [internalValue, setInternalValue] = useState("");
  const [isModelPickerOpen, setIsModelPickerOpen] = useState(false);
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [slashQuery, setSlashQuery] = useState("");
  const [localWebSearch, setLocalWebSearch] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const modelChipRef = useRef<HTMLButtonElement>(null);
  const {
    selectedModelId,
    providers,
    enabledModelIds,
    langSearchApiKey,
    langSearchEnabled,
    projects,
    activeChatId,
    addChatToProject,
    removeChatFromProject,
    activeProjectId,
    setActiveProjectId,
  } = useStore();

  const effectiveLangSearchApiKey = langSearchEnabled ? langSearchApiKey : "";
  const navigateToConnections = () => {
    useStore.getState().setSettingsSection("connections");
    useStore.getState().setActiveView("settings");
  };

  const text = externalValue !== undefined ? externalValue : internalValue;

  const enabledModels = useMemo(() => {
    return providers.flatMap((p) =>
      p.models.filter((m) => enabledModelIds.includes(m.id)),
    );
  }, [providers, enabledModelIds]);

  const model =
    providers.flatMap((p) => p.models).find((m) => m.id === selectedModelId) ||
    enabledModels[0];

  const modelCanWebSearch = model?.capabilities?.webSearch ?? false;

  const canOpenPicker = enabledModels.length >= 2;

  const handleTextChange = useCallback(
    (newValue: string) => {
      if (onChange) {
        onChange(newValue);
      } else {
        setInternalValue(newValue);
      }

      if (newValue.startsWith("/") && !newValue.includes(" ")) {
        setShowSlashMenu(true);
        setSlashQuery(newValue.slice(1));
      } else {
        setShowSlashMenu(false);
        setSlashQuery("");
      }
    },
    [onChange],
  );

  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height =
      Math.min(ta.scrollHeight, variant === "home" ? 180 : 140) + "px";
  }, [text, variant]);

  const handleSlashSelect = useCallback(
    (cmd: SlashCommand) => {
      setShowSlashMenu(false);
      setSlashQuery("");
      const insert = cmd.format ?? cmd.command + " ";
      handleTextChange(insert);
      textareaRef.current?.focus();
    },
    [handleTextChange],
  );

  const handleSend = useCallback(() => {
    if (!text.trim() || isStreaming) return;
    onSend(text.trim());
    handleTextChange("");
    setShowSlashMenu(false);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }, [text, isStreaming, onSend, handleTextChange]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (showSlashMenu) return;

      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [showSlashMenu, handleSend],
  );

  const handleAddFiles = () => {
    fileInputRef.current?.click();
  };

  const handleScreenshot = () => {};
  const handleSkills = () => {};
  const handleAddConnectors = () => {};
  const handleAddChatToProject = (projectId: string) => {
    if (activeChatId) {
      addChatToProject(projectId, activeChatId);
    } else {
      setActiveProjectId(projectId);
    }
  };
  const handleStyleChange = (style: ResponseStyleId) => {
    onStyleChange?.(style);
  };

  const [isProjectHovered, setIsProjectHovered] = useState(false);

  const activeProject = useMemo(() => {
    if (activeChatId) {
      return projects.find((p) => p.chatIds.includes(activeChatId)) || null;
    }
    if (activeProjectId) {
      return projects.find((p) => p.id === activeProjectId) || null;
    }
    return null;
  }, [activeChatId, activeProjectId, projects]);

  const hasText = text.trim().length > 0;
  const webSearchEnabled =
    extWebSearchEnabled !== undefined ? extWebSearchEnabled : localWebSearch;
  const handleWebSearchToggle = onWebSearchToggle || setLocalWebSearch;

  return (
    <div className={`in-wrap${variant === "home" ? "" : ""}`}>
      <div className={`in-box${variant === "home" ? " home-in-box" : ""}`}>
        <textarea
          ref={textareaRef}
          className={variant === "home" ? "byte-ta" : "small-ta"}
          placeholder={variant === "home" ? "Ask anything…" : "Reply…"}
          value={text}
          onChange={(e) => handleTextChange(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={variant === "home" ? 3 : 1}
        />
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,.pdf,.txt,.docx"
          multiple
          style={{ display: "none" }}
        />
        {showSlashMenu && (
          <SlashCommandMenu
            query={slashQuery}
            anchorRect={textareaRef.current?.getBoundingClientRect() ?? null}
            onSelect={handleSlashSelect}
            onClose={() => {
              setShowSlashMenu(false);
              setSlashQuery("");
            }}
            direction={variant === "chat" ? "up" : "down"}
          />
        )}
        <div
          className={variant === "home" ? "home-in-footer" : "in-row-bottom"}
        >
          <div className="in-tools">
            <PlusMenu
              onAddFiles={handleAddFiles}
              onScreenshot={handleScreenshot}
              onSkills={handleSkills}
              onAddConnectors={handleAddConnectors}
              onStyleChange={handleStyleChange}
              currentStyle={responseStyle}
              webSearchEnabled={webSearchEnabled}
              onWebSearchToggle={handleWebSearchToggle}
              memoryEnabled={memoryEnabled}
              onMemoryToggle={onMemoryToggle}
              direction="up"
              modelCanWebSearch={modelCanWebSearch}
              langSearchApiKey={effectiveLangSearchApiKey}
              onNavigateToConnections={navigateToConnections}
              projects={projects}
              activeChatId={activeChatId}
              onAddChatToProject={handleAddChatToProject}
              onRemoveChatFromProject={removeChatFromProject}
            />
            {activeProject && (
              <button
                className="t-btn"
                title={
                  isProjectHovered
                    ? "Remove from project"
                    : `Project: ${activeProject.name}`
                }
                onMouseEnter={() => setIsProjectHovered(true)}
                onMouseLeave={() => setIsProjectHovered(false)}
                onClick={() => {
                  if (activeChatId) {
                    removeChatFromProject(activeProject.id, activeChatId);
                  } else if (activeProjectId) {
                    setActiveProjectId(null);
                  }
                  setIsProjectHovered(false);
                }}
                style={{
                  width: 28,
                  height: 28,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: "var(--r-sm)",
                  border: "none",
                  background: isProjectHovered
                    ? "rgba(var(--acc-r),var(--acc-g),var(--acc-b),.15)"
                    : activeProject.color + "22",
                  cursor: "pointer",
                  color: isProjectHovered ? "var(--tx)" : activeProject.color,
                  transition: "background 0.15s, color 0.15s",
                }}
              >
                {isProjectHovered ? <X size={14} /> : <Folder size={14} />}
              </button>
            )}
          </div>
          <div className="in-right">
            {model &&
              (canOpenPicker ? (
                <button
                  ref={modelChipRef}
                  className="model-chip"
                  onClick={() => setIsModelPickerOpen(!isModelPickerOpen)}
                  title="Change model"
                >
                  {getDisplayName(model.id)}
                  <ChevronDown size={12} style={{ marginLeft: "4px" }} />
                </button>
              ) : (
                <span className="model-chip">{getDisplayName(model.id)}</span>
              ))}
            <ModelPicker
              isOpen={isModelPickerOpen}
              onClose={() => setIsModelPickerOpen(false)}
              triggerRef={modelChipRef}
              direction="up"
            />
            {isStreaming ? (
              <button
                className="send send-stopping"
                onClick={onStop}
                title="Stop generation"
                style={{
                  background: "var(--danger-fill)",
                  borderColor: "var(--danger-fill)",
                  color: "var(--white)",
                }}
              >
                <Square size={14} fill="currentColor" />
              </button>
            ) : (
              <button
                className={`send home-action-btn${hasText ? " has-text" : ""}`}
                onClick={handleSend}
                title={hasText ? "Send" : "Voice / Send"}
                disabled={!hasText && !isStreaming}
              >
                <span className="hab-voice">
                  <Mic size={14} />
                </span>
                <span className="hab-send">
                  <Send size={14} />
                </span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
