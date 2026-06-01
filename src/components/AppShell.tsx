import { useEffect, useState, useCallback } from "react";
import { useStore } from "../store/useStore";
import { Sidebar } from "./sidebar/Sidebar";
import { Topbar } from "./topbar/Topbar";
import { HomeView } from "./views/HomeView";
import { ChatView } from "./views/ChatView";
import { ChatsListView } from "./views/ChatsListView";
import { SettingsView } from "./views/SettingsView";
import { ProjectsView } from "./views/ProjectsView";
import { ProjectDetailView } from "./views/ProjectDetailView";
import { CouncilView } from "./views/CouncilView";
import { CustomizeView } from "./views/CustomizeView";
import { NewChatView } from "./views/NewChatView";
import { SparksView } from "./views/SparksView";
import { AgentsView } from "./views/AgentsView";
import { AskQuestion } from "./shared/AskQuestion";
import { SuggestMemory } from "./shared/SuggestMemory";
import type {
  AskQuestionPayload,
  SuggestMemoryPayload,
  Message,
} from "../types";

export function AppShell() {
  const {
    activeView,
    theme,
    layoutMode,
    fontFamily,
    headingFont,
    chats,
    activeChatId,
    updateChat,
    addMemory,
    inputGlowEnabled,
    inputGlowColor,
  } = useStore();
  const [updateAvailable, setUpdateAvailable] = useState<{
    version: string;
    installing: boolean;
    installed: boolean;
  } | null>(null);
  const [activeAskQuestion, setActiveAskQuestion] =
    useState<AskQuestionPayload | null>(null);
  const [activeSuggestMemory, setActiveSuggestMemory] =
    useState<SuggestMemoryPayload | null>(null);
  const chat = chats.find((c) => c.id === activeChatId);

  useEffect(() => {
    document.body.className = theme;
    if (layoutMode === "icons") document.body.classList.add("ly-icons");
    if (layoutMode === "none") document.body.classList.add("ly-none");
  }, [theme, layoutMode]);

  useEffect(() => {
    document.body.style.setProperty("--font", fontFamily);
    document.body.style.setProperty("--font-d", headingFont);
  }, [fontFamily, headingFont]);

  useEffect(() => {
    if (inputGlowEnabled) {
      document.body.style.setProperty("--input-glow", `${inputGlowColor}1a`);
    } else {
      document.body.style.setProperty("--input-glow", "transparent");
    }
  }, [inputGlowEnabled, inputGlowColor]);

  // Check for updates on startup and periodically
  useEffect(() => {
    const checkForUpdates = async () => {
      if (!useStore.getState().autoUpdateEnabled) return;
      try {
        const { check } = await import("@tauri-apps/plugin-updater");
        const update = await check();
        if (update?.version && update.version !== "0.1.0") {
          setUpdateAvailable({
            version: update.version,
            installing: false,
            installed: false,
          });
        }
      } catch {
        // not in Tauri or updater unavailable
      }
    };

    // Check on startup
    checkForUpdates();

    // Check every hour
    const interval = setInterval(checkForUpdates, 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const handleInstallUpdate = async () => {
    if (!updateAvailable) return;

    // Detect if we are on macOS
    const isMac = navigator.userAgent.toLowerCase().includes("mac");

    if (isMac) {
      // On macOS without code signing, auto-update fails.
      // Redirect user to download manually from GitHub Releases.
      window.open("https://github.com/usebyte/byte/releases/latest", "_blank");
      return;
    }

    setUpdateAvailable({
      ...updateAvailable,
      installing: true,
      installed: false,
    });
    try {
      const { check } = await import("@tauri-apps/plugin-updater");
      const update = await check();
      if (update) {
        await update.downloadAndInstall();
        setUpdateAvailable({
          version: updateAvailable.version,
          installing: false,
          installed: true,
        });
      }
    } catch (error) {
      console.error("Failed to install update:", error);
      setUpdateAvailable({
        ...updateAvailable,
        installing: false,
        installed: false,
      });
    }
  };

  // Listen for suggest_memory events from ChatView/HomeView
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as SuggestMemoryPayload;
      if (detail?.name && detail?.content) {
        setActiveSuggestMemory(detail);
      }
    };
    window.addEventListener("byte:suggest-memory", handler);
    return () => window.removeEventListener("byte:suggest-memory", handler);
  }, []);

  const handleAskQuestionComplete = useCallback(
    (answers: Record<string, string | string[] | number>) => {
      if (!activeChatId || !chat) return;

      const answerText = Object.entries(answers)
        .map(([qId, val]) => {
          const q = activeAskQuestion?.questions.find((q) => q.id === qId);
          const label = q?.question || qId;
          const value = Array.isArray(val) ? val.join(", ") : String(val);
          return `${label}: ${value}`;
        })
        .join("\n");

      const resultMessage: Message = {
        id: crypto.randomUUID(),
        role: "user",
        content: answerText,
        timestamp: Date.now(),
        status: "sent",
      };

      updateChat(activeChatId, {
        messages: [...chat.messages, resultMessage],
      });

      setTimeout(() => {
        window.dispatchEvent(
          new CustomEvent("byte:continue-chat", {
            detail: { chatId: activeChatId },
          }),
        );
      }, 50);
    },
    [activeChatId, chat, activeAskQuestion, updateChat],
  );

  const handleAskQuestionCancel = useCallback(() => {
    if (!activeChatId || !chat) return;

    const cancelMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: "Cancelled Question",
      timestamp: Date.now(),
      status: "sent",
    };

    updateChat(activeChatId, {
      messages: [...chat.messages, cancelMessage],
    });
  }, [activeChatId, chat, updateChat]);

  const handleSaveMemory = useCallback(
    (name: string, content: string) => {
      addMemory({ name, content });
      setActiveSuggestMemory(null);

      // Remove any "Suggesting memory..." placeholder from current chat
      if (activeChatId && chat) {
        const cleaned = chat.messages.filter(
          (m) => m.content !== "Suggesting memory...",
        );
        if (cleaned.length !== chat.messages.length) {
          updateChat(activeChatId, { messages: cleaned });
        }
      }
    },
    [activeChatId, chat, addMemory, updateChat],
  );

  const handleDeclineMemory = useCallback(() => {
    setActiveSuggestMemory(null);

    // Remove any "Suggesting memory..." placeholder from current chat
    if (activeChatId && chat) {
      const cleaned = chat.messages.filter(
        (m) => m.content !== "Suggesting memory...",
      );
      if (cleaned.length !== chat.messages.length) {
        updateChat(activeChatId, { messages: cleaned });
      }
    }
  }, [activeChatId, chat, updateChat]);

  // Global drag-and-drop handlers to allow drops on nested elements
  useEffect(() => {
    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };

    const handleDragEnter = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };

    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };

    const handleDrop = (e: DragEvent) => {
      // Prevent default browser drop behavior
      e.preventDefault();
      e.stopPropagation();
    };

    document.addEventListener("dragover", handleDragOver);
    document.addEventListener("dragenter", handleDragEnter);
    document.addEventListener("dragleave", handleDragLeave);
    document.addEventListener("drop", handleDrop);

    return () => {
      document.removeEventListener("dragover", handleDragOver);
      document.removeEventListener("dragenter", handleDragEnter);
      document.removeEventListener("dragleave", handleDragLeave);
      document.removeEventListener("drop", handleDrop);
    };
  }, []);

  const renderView = () => {
    switch (activeView) {
      case "home":
        return <HomeView />;
      case "new-chat":
        return <NewChatView />;
      case "chat":
        return (
          <ChatView
            onAskQuestionDetected={setActiveAskQuestion}
            activeAskQuestion={activeAskQuestion}
            activeSuggestMemory={activeSuggestMemory}
          />
        );
      case "chats":
        return <ChatsListView />;
      case "settings":
        return <SettingsView />;
      case "projects":
        return <ProjectsView />;
      case "project-detail":
        return <ProjectDetailView />;
      case "council":
        return <CouncilView />;
      case "customize":
        return <CustomizeView />;
      case "sparks":
        return <SparksView />;
      case "agents":
        return <AgentsView />;
      default:
        return <HomeView />;
    }
  };

  return (
    <div id="s-app" className="scr on">
      <Sidebar />
      <div className="main">
        {updateAvailable && (
          <div className="upd-banner">
            <span>Byte {updateAvailable.version} available</span>
            <button
              className="upd-link"
              onClick={handleInstallUpdate}
              disabled={updateAvailable.installing}
            >
              {updateAvailable.installing
                ? "Installing..."
                : updateAvailable.installed
                  ? "Restart to apply"
                  : navigator.userAgent.toLowerCase().includes("mac")
                    ? "Download Update"
                    : "Install Update"}
            </button>
            <button
              className="upd-dismiss"
              onClick={() => setUpdateAvailable(null)}
            >
              &times;
            </button>
          </div>
        )}
        <Topbar />
        {renderView()}
        {activeAskQuestion && (
          <AskQuestion
            payload={activeAskQuestion}
            onComplete={(answers) => {
              handleAskQuestionComplete(answers);
              setActiveAskQuestion(null);
            }}
            onCancel={() => {
              handleAskQuestionCancel();
              setActiveAskQuestion(null);
            }}
          />
        )}
        {activeSuggestMemory && (
          <SuggestMemory
            initialName={activeSuggestMemory.name}
            initialContent={activeSuggestMemory.content}
            onSave={handleSaveMemory}
            onDecline={handleDeclineMemory}
          />
        )}
      </div>
    </div>
  );
}
