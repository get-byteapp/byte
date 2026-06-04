import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { ChevronDown, Sparkles } from "lucide-react";
import { useStore } from "../../store/useStore";
import { InputBox } from "../shared/InputBox";
import { makeModelKey, resolveModel } from "../../lib/api";
import { ICON_MAP } from "../../lib/quickPrompts";
import type { ResponseStyleId, ImageAttachment, ToolId } from "../../types";
import type { Prompt } from "../../lib/quickPrompts";

interface PlaceholderWizardState {
  prompt: Prompt;
  currentIndex: number;
  values: Record<string, string>;
  inputRef: HTMLInputElement | null;
}

export function HomeView() {
  const {
    newChat,
    selectedModelId,
    providers,
    enabledModelIds,
    defaultResponseStyle,
    setDefaultResponseStyle,
    defaultMemoryEnabled,
    setDefaultMemoryEnabled,
    defaultWebSearchEnabled,
    setDefaultWebSearchEnabled,
    defaultCodeExecutionEnabled,
    setDefaultCodeExecutionEnabled,
    quickPrompts,
  } = useStore();
  const [inputValue, setInputValue] = useState("");
  const [openPill, setOpenPill] = useState<string | null>(null);
  const [wizardState, setWizardState] = useState<PlaceholderWizardState | null>(
    null,
  );
  const [wizardInput, setWizardInput] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const pillRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  // Filter to only enabled prompts
  const enabledPrompts = useMemo(
    () => quickPrompts.filter((c) => c.enabled),
    [quickPrompts],
  );

  // Update inputValue with live preview when wizard is active
  useEffect(() => {
    if (wizardState) {
      let preview = wizardState.prompt.prompt;

      // Replace ALL placeholders - already filled + current + unfilled
      wizardState.prompt.placeholders!.forEach((ph, idx) => {
        let value = "";
        if (idx < wizardState.currentIndex) {
          // Already filled - use stored value
          value = wizardState.values[ph.key] || "";
        } else if (idx === wizardState.currentIndex) {
          // Current one being edited - use what user is typing
          value = wizardInput;
        } else {
          // Not yet filled - show as {{key}}
          value = "";
        }

        const regex = new RegExp(`\\{\\{${ph.key}\\}\\}`, "g");
        preview = preview.replace(regex, value || `{{${ph.key}}}`);
      });

      setInputValue(preview);
    }
  }, [wizardState, wizardInput]);

  const enabledModels = useMemo(() => {
    return providers.flatMap((p) =>
      p.models.filter((m) =>
        enabledModelIds.includes(makeModelKey(p.id, m.id)),
      ),
    );
  }, [providers, enabledModelIds]);

  const selectedModel =
    resolveModel(providers, selectedModelId).model || enabledModels[0];
  const contextWindow = selectedModel?.contextWindow || 128000;

  const tokenCount = useMemo(() => {
    if (!inputValue.trim()) return 0;
    return Math.ceil(inputValue.length / 4);
  }, [inputValue]);

  const tokenPercent =
    contextWindow > 0 ? (tokenCount / contextWindow) * 100 : 0;
  const greeting = getGreeting();

  const handleSend = (text: string, attachments?: ImageAttachment[]) => {
    if (!text.trim()) return;
    const tools: ToolId[] = ["ASK_QUESTION"];
    if (defaultWebSearchEnabled) tools.push("WEB_SEARCH");
    if (defaultCodeExecutionEnabled) tools.push("CODE_EXECUTION");
    const chatId = newChat(
      text,
      tools.length > 1 ? { enabledTools: tools } : undefined,
    );
    setTimeout(() => {
      window.dispatchEvent(
        new CustomEvent("byte:new-chat-message", {
          detail: { text, chatId, attachments },
        }),
      );
    }, 50);
    setInputValue("");
  };

  const handleStyleChange = useCallback(
    (style: ResponseStyleId) => {
      setDefaultResponseStyle(style);
    },
    [setDefaultResponseStyle],
  );

  const handleMemoryToggle = useCallback(
    (enabled: boolean) => {
      setDefaultMemoryEnabled(enabled);
    },
    [setDefaultMemoryEnabled],
  );

  const handleWebSearchToggle = useCallback(
    (enabled: boolean) => {
      setDefaultWebSearchEnabled(enabled);
    },
    [setDefaultWebSearchEnabled],
  );

  const handleCodeExecutionToggle = useCallback(
    (enabled: boolean) => {
      setDefaultCodeExecutionEnabled(enabled);
    },
    [setDefaultCodeExecutionEnabled],
  );

  const handlePillClick = (pillId: string) => {
    if (openPill === pillId) {
      setOpenPill(null);
    } else {
      setOpenPill(pillId);
    }
  };

  const handlePromptSelect = (prompt: Prompt) => {
    setOpenPill(null);

    // If prompt has placeholders, start wizard
    if (prompt.placeholders && prompt.placeholders.length > 0) {
      setWizardState({
        prompt,
        currentIndex: 0,
        values: {},
        inputRef: null,
      });
      setWizardInput("");
      // Focus the wizard input after render
      setTimeout(() => {
        const input = document.querySelector(
          ".placeholder-wizard-input",
        ) as HTMLInputElement;
        if (input) input.focus();
      }, 0);
    } else {
      // No placeholders, just set the prompt text
      setInputValue(prompt.prompt);
    }
  };

  const handleWizardNext = () => {
    if (!wizardState) return;

    const currentPlaceholder =
      wizardState.prompt.placeholders![wizardState.currentIndex];
    const newValues = {
      ...wizardState.values,
      [currentPlaceholder.key]: wizardInput,
    };

    if (
      wizardState.currentIndex <
      wizardState.prompt.placeholders!.length - 1
    ) {
      // Move to next placeholder
      setWizardState({
        ...wizardState,
        currentIndex: wizardState.currentIndex + 1,
        values: newValues,
      });
      setWizardInput("");
      setTimeout(() => {
        const input = document.querySelector(
          ".placeholder-wizard-input",
        ) as HTMLInputElement;
        if (input) input.focus();
      }, 0);
    } else {
      // All placeholders filled, just close wizard (input already has final value)
      setWizardState(null);
      setWizardInput("");
      // Focus the textarea
      setTimeout(() => {
        const ta = document.querySelector(".byte-ta") as HTMLTextAreaElement;
        if (ta) {
          ta.focus();
          ta.setSelectionRange(ta.value.length, ta.value.length);
        }
      }, 50);
    }
  };

  const handleWizardCancel = () => {
    setWizardState(null);
    setWizardInput("");
  };

  // Close on escape (also close wizard)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (wizardState) {
          setWizardState(null);
          setWizardInput("");
        } else {
          setOpenPill(null);
        }
      }
    };
    if (openPill || wizardState) {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [openPill, wizardState]);

  const handleWizardKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleWizardNext();
    } else if (e.key === "Escape") {
      handleWizardCancel();
    }
  };

  // Close wizard on escape
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && wizardState) {
        handleWizardCancel();
      }
    };
    if (wizardState) {
      document.addEventListener("keydown", handleGlobalKeyDown);
      return () => document.removeEventListener("keydown", handleGlobalKeyDown);
    }
  }, [wizardState]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        const target = e.target as HTMLElement;
        const isPill = target.closest(".sug-pill");
        if (!isPill) {
          setOpenPill(null);
        }
      }
    };
    if (openPill) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [openPill]);

  return (
    <div className="view on" style={{ flexDirection: "column" }}>
      <div className="home-stage">
        <div className="home-greet">
          <div className="home-name">
            {greeting}, <em>friend</em>
          </div>
          <div className="home-sub">What can Byte help with today?</div>
        </div>

        <div style={{ width: "100%", maxWidth: 680 }}>
          <InputBox
            variant="home"
            onSend={handleSend}
            value={inputValue}
            onChange={setInputValue}
            responseStyle={defaultResponseStyle}
            onStyleChange={handleStyleChange}
            memoryEnabled={defaultMemoryEnabled}
            onMemoryToggle={handleMemoryToggle}
            webSearchEnabled={defaultWebSearchEnabled}
            onWebSearchToggle={handleWebSearchToggle}
            codeExecutionEnabled={defaultCodeExecutionEnabled}
            onCodeExecutionToggle={handleCodeExecutionToggle}
          />
        </div>

        {/* Placeholder Wizard Overlay */}
        {wizardState && wizardState.prompt.placeholders && (
          <div
            className="placeholder-wizard"
            style={{
              width: "100%",
              maxWidth: 680,
              marginTop: 16,
              animation: "up .15s ease",
            }}
          >
            <div className="placeholder-wizard-header">
              <span className="placeholder-wizard-title">
                {wizardState.prompt.name}
              </span>
              <span className="placeholder-wizard-progress">
                {wizardState.currentIndex + 1} of{" "}
                {wizardState.prompt.placeholders.length}
              </span>
              <button
                className="placeholder-wizard-close"
                onClick={handleWizardCancel}
              >
                <ChevronDown size={14} style={{ transform: "rotate(45deg)" }} />
              </button>
            </div>
            <div className="placeholder-wizard-label">
              {wizardState.prompt.placeholders[wizardState.currentIndex].label}
            </div>
            <input
              className="placeholder-wizard-input"
              type="text"
              value={wizardInput}
              onChange={(e) => setWizardInput(e.target.value)}
              onKeyDown={handleWizardKeyDown}
              placeholder={`Enter ${wizardState.prompt.placeholders[wizardState.currentIndex].label.toLowerCase()}...`}
              autoFocus
            />
            <div className="placeholder-wizard-hint">
              Press <kbd>Enter</kbd> to continue, <kbd>Esc</kbd> to cancel
            </div>
          </div>
        )}

        <div className="tok-bar" style={{ width: "100%", maxWidth: 680 }}>
          <div className="tok-track">
            <div
              className={`tok-fill ${tokenPercent > 90 ? "danger" : tokenPercent > 75 ? "warn" : ""}`}
              style={{ width: `${Math.min(tokenPercent, 100)}%` }}
            ></div>
          </div>
          <div className="tok-labels">
            <span>
              {tokenCount.toLocaleString()} / {contextWindow.toLocaleString()}{" "}
              tokens used
            </span>
          </div>
        </div>

        <div
          className={`home-suggestions ${inputValue.trim() ? "hidden" : ""}`}
          style={{ position: "relative" }}
        >
          {enabledPrompts.map((cat) => {
            const Icon = ICON_MAP[cat.icon] || ICON_MAP.Code;
            return (
              <button
                key={cat.id}
                ref={(el) => {
                  pillRefs.current[cat.id] = el;
                }}
                className={`sug-pill${openPill === cat.id ? " sug-pill-active" : ""}`}
                onClick={() => handlePillClick(cat.id)}
              >
                <Icon size={13} />
                <span>{cat.label}</span>
                <ChevronDown size={11} className="sug-pill-chevron" />
              </button>
            );
          })}

          {openPill &&
            (() => {
              const cat = enabledPrompts.find((c) => c.id === openPill);
              if (!cat) return null;
              const btn = pillRefs.current[openPill];
              const btnRect = btn?.getBoundingClientRect();
              const parentRect = btn?.parentElement?.getBoundingClientRect();

              return (
                <div
                  ref={dropdownRef}
                  className="sug-dropdown"
                  style={{
                    position: "absolute",
                    left:
                      btnRect && parentRect
                        ? btnRect.left - parentRect.left
                        : 0,
                    bottom: "100%",
                    marginBottom: 6,
                  }}
                >
                  <div className="sug-dropdown-header">{cat.label}</div>
                  <div className="sug-dropdown-list">
                    {cat.prompts.map((prompt) => (
                      <button
                        key={prompt.id}
                        className="sug-dropdown-item"
                        onClick={() => handlePromptSelect(prompt)}
                      >
                        <Sparkles size={12} className="sug-dropdown-arrow" />
                        <span>{prompt.name}</span>
                        {prompt.placeholders &&
                          prompt.placeholders.length > 0 && (
                            <span className="sug-dropdown-has-wizard">●</span>
                          )}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })()}
        </div>
      </div>
    </div>
  );
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  if (hour < 21) return "Good evening";
  return "Good night";
}
