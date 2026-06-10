import { useState, useMemo } from "react";
import {
  MessageSquare,
  Plus,
  Search,
  Check,
  Star,
  Bookmark,
  Trash2,
  FolderPlus,
} from "lucide-react";
import { useStore } from "../../store/useStore";
import { ChatMenu } from "../shared/ChatMenu";

export function ChatsListView() {
  const {
    chats,
    activeChatId,
    setActiveChatId,
    setActiveView,
    removeChat,
    updateChat,
    toggleSaved,
    aiSearch,
  } = useStore();
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const formatDate = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const dayMs = 24 * 60 * 60 * 1000;
    if (diff < dayMs) {
      return new Date(timestamp).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    } else if (diff < 2 * dayMs) {
      return "Yesterday";
    } else if (diff < 7 * dayMs) {
      return new Date(timestamp).toLocaleDateString([], { weekday: "short" });
    } else {
      return new Date(timestamp).toLocaleDateString([], {
        month: "short",
        day: "numeric",
      });
    }
  };

  const getPreview = (content: string) => {
    const firstMsg = content.split("\n")[0];
    return firstMsg.length > 45 ? firstMsg.slice(0, 45) + "..." : firstMsg;
  };

  const filteredChats = useMemo(() => {
    if (!searchQuery) return chats;
    const q = searchQuery.toLowerCase();

    // First pass: search by title
    const titleMatches = chats.filter((c) =>
      c.title?.toLowerCase().includes(q),
    );

    // Second pass: search through message content
    if (titleMatches.length > 0) return titleMatches;

    const contentMatches = chats.filter((c) =>
      c.messages.some((m) => m.content?.toLowerCase().includes(q)),
    );

    return contentMatches;
  }, [chats, searchQuery]);

  const starredChats = useMemo(
    () =>
      filteredChats
        .filter((c) => c.saved)
        .sort((a, b) => b.updatedAt - a.updatedAt),
    [filteredChats],
  );

  const savedChats = useMemo(
    () =>
      filteredChats
        .filter((c) => c.saved)
        .sort((a, b) => b.updatedAt - a.updatedAt),
    [filteredChats],
  );

  const activeChats = useMemo(
    () =>
      filteredChats
        .filter((c) => !c.saved)
        .sort((a, b) => b.updatedAt - a.updatedAt),
    [filteredChats],
  );

  const handleChatClick = (chatId: string) => {
    if (selectMode) {
      const newSet = new Set(selectedIds);
      if (newSet.has(chatId)) {
        newSet.delete(chatId);
      } else {
        newSet.add(chatId);
      }
      setSelectedIds(newSet);
    } else {
      setActiveChatId(chatId);
      setActiveView("chat");
    }
  };

  const toggleSelectMode = () => {
    setSelectMode(!selectMode);
    if (selectMode) setSelectedIds(new Set());
  };

  const selectAll = () => {
    setSelectedIds(new Set(filteredChats.map((c) => c.id)));
  };

  const handleDeleteSelected = () => {
    if (selectedIds.size === 0) return;
    setShowDeleteConfirm(true);
  };

  const confirmDelete = () => {
    selectedIds.forEach((chatId) => {
      removeChat(chatId);
    });
    setSelectedIds(new Set());
    setSelectMode(false);
    setShowDeleteConfirm(false);
  };

  const cancelDelete = () => {
    setShowDeleteConfirm(false);
  };

  const handleNewChat = () => {
    setActiveView("home");
  };

  const handleDelete = (chatId: string) => {
    removeChat(chatId);
  };

  const handleStar = (chatId: string) => {
    toggleSaved(chatId);
  };

  const handleRename = (chat: { id: string; title: string }) => {
    setEditingId(chat.id);
    setEditingName(chat.title || "");
  };

  const handleRenameSubmit = (chatId: string) => {
    if (editingName.trim()) {
      updateChat(chatId, { title: editingName.trim() });
    }
    setEditingId(null);
  };

  const handleRenameKeyDown = (e: React.KeyboardEvent, chatId: string) => {
    if (e.key === "Enter") {
      handleRenameSubmit(chatId);
    } else if (e.key === "Escape") {
      setEditingId(null);
    }
  };

  return (
    <div
      className="view on"
      style={{ flexDirection: "column", height: "100%" }}
    >
      <div
        style={{
          flex: 1,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            flex: 1,
            overflow: "auto",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 760,
              margin: "0 auto",
              padding: "32px 24px 60px",
              display: "flex",
              flexDirection: "column",
              flex: 1,
            }}
          >
            {/* Header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 20,
              }}
            >
              <div className="vi-h" style={{ marginBottom: 0 }}>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <span
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 6,
                      background: "var(--sf2)",
                      border: "1px solid var(--bd)",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "var(--tx2)",
                    }}
                  >
                    <MessageSquare size={14} />
                  </span>
                  Chats
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <button
                  className={`btn btn-sm ${selectMode ? "btn-active" : ""}`}
                  onClick={toggleSelectMode}
                >
                  {selectMode ? "Selecting" : "Select"}
                </button>
                <button
                  className="btn btn-sm"
                  onClick={handleNewChat}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <Plus size={11} />
                  New chat
                </button>
              </div>
            </div>

            {/* Selection bar */}
            {selectMode && (
              <div
                className="selection-bar"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "10px 14px",
                  background:
                    "rgba(var(--acc-r),var(--acc-g),var(--acc-b),.08)",
                  border:
                    "1px solid rgba(var(--acc-r),var(--acc-g),var(--acc-b),.2)",
                  borderRadius: "var(--r-sm)",
                  marginBottom: 14,
                }}
              >
                <div
                  style={{
                    flex: 1,
                    fontSize: "calc(var(--fs) - 1px)",
                    color: "var(--tx2)",
                  }}
                >
                  {selectedIds.size} selected
                </div>
                <button className="btn btn-sm" onClick={selectAll}>
                  Select all
                </button>
                <button
                  className="btn btn-sm"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                  }}
                >
                  <FolderPlus size={11} />
                  Add to project
                </button>
                <button
                  type="button"
                  className="btn btn-sm"
                  onClick={handleDeleteSelected}
                  disabled={selectedIds.size === 0}
                  style={{
                    color: "var(--danger-fill)",
                    borderColor: "var(--danger-border)",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                    opacity: selectedIds.size === 0 ? 0.5 : 1,
                    cursor: selectedIds.size === 0 ? "not-allowed" : "pointer",
                  }}
                >
                  <Trash2 size={11} />
                  Delete
                </button>
                <button className="btn btn-sm" onClick={toggleSelectMode}>
                  Cancel
                </button>
              </div>
            )}

            {/* Search bar */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                background: "var(--sf)",
                border: "1px solid var(--bd)",
                borderRadius: "var(--r-lg)",
                padding: "10px 16px",
                marginBottom: 8,
              }}
            >
              <Search size={13} style={{ color: "var(--tx3)" }} />
              <input
                type="text"
                placeholder="Search your chats…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  flex: 1,
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  fontSize: "var(--fs)",
                  color: "var(--tx)",
                  fontFamily: "var(--font)",
                }}
              />
            </div>

            {/* Chat list */}
            <div className={selectMode ? "select-mode" : ""}>
              {filteredChats.length === 0 ? (
                <div
                  style={{
                    textAlign: "center",
                    padding: "60px 20px",
                    color: "var(--tx4)",
                  }}
                >
                  <div style={{ marginBottom: 12 }}>
                    <MessageSquare size={32} />
                  </div>
                  {searchQuery ? (
                    <>
                      No chats match "{searchQuery}".
                      <br />
                      <span style={{ fontSize: "calc(var(--fs) - 1px)" }}>
                        {aiSearch
                          ? "AI search is enabled — try a different description of what you're looking for."
                          : "Try a different search term or browse all chats."}
                      </span>
                    </>
                  ) : (
                    <>
                      No chats yet.
                      <br />
                      Start a new conversation.
                    </>
                  )}
                </div>
              ) : (
                <>
                  {/* Recent section */}
                  {activeChats.length > 0 && (
                    <>
                      <div className="chats-section-header">
                        <span className="chats-section-label">Recent</span>
                      </div>
                      {activeChats.map((chat) => (
                        <div
                          key={chat.id}
                          className={`chat-list-item ${selectedIds.has(chat.id) ? "selected" : ""} ${activeChatId === chat.id ? "active-chat" : ""}`}
                          onClick={() => handleChatClick(chat.id)}
                        >
                          <div
                            className="chat-cb"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleChatClick(chat.id);
                            }}
                          >
                            {selectedIds.has(chat.id) && <Check size={10} />}
                          </div>
                          <div
                            className="cli-content"
                            style={{ flex: 1, minWidth: 0 }}
                          >
                            {editingId === chat.id ? (
                              <input
                                type="text"
                                className="cli-edit-input"
                                value={editingName}
                                onChange={(e) => setEditingName(e.target.value)}
                                onBlur={() => handleRenameSubmit(chat.id)}
                                onKeyDown={(e) =>
                                  handleRenameKeyDown(e, chat.id)
                                }
                                onClick={(e) => e.stopPropagation()}
                                autoFocus
                              />
                            ) : (
                              <>
                                <div className="cli-title">
                                  {chat.title || "New chat"}
                                </div>
                                <div className="cli-meta">
                                  {chat.messages.length > 0
                                    ? getPreview(chat.messages[0].content)
                                    : "No messages"}
                                  {" · "}
                                  {formatDate(chat.updatedAt)}
                                </div>
                              </>
                            )}
                          </div>
                          <ChatMenu
                            onStar={() => handleStar(chat.id)}
                            onRename={() => handleRename(chat)}
                            onDelete={() => handleDelete(chat.id)}
                            isSaved={chat.saved}
                          />
                        </div>
                      ))}
                    </>
                  )}

                  {/* Starred section */}
                  {starredChats.length > 0 && (
                    <>
                      <div className="chats-section-header">
                        <span
                          className="chats-section-label"
                          style={{
                            color:
                              "rgba(var(--acc-r),var(--acc-g),var(--acc-b),.8)",
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                          }}
                        >
                          <Star size={9} />
                          Starred
                        </span>
                        <span className="chats-section-info">Always kept</span>
                      </div>
                      {starredChats.map((chat) => (
                        <div
                          key={chat.id}
                          className={`chat-list-item ${selectedIds.has(chat.id) ? "selected" : ""} ${activeChatId === chat.id ? "active-chat" : ""}`}
                          onClick={() => handleChatClick(chat.id)}
                        >
                          <div
                            className="chat-cb"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleChatClick(chat.id);
                            }}
                          >
                            {selectedIds.has(chat.id) && <Check size={10} />}
                          </div>
                          <div
                            className="cli-content"
                            style={{ flex: 1, minWidth: 0 }}
                          >
                            {editingId === chat.id ? (
                              <input
                                type="text"
                                className="cli-edit-input"
                                value={editingName}
                                onChange={(e) => setEditingName(e.target.value)}
                                onBlur={() => handleRenameSubmit(chat.id)}
                                onKeyDown={(e) =>
                                  handleRenameKeyDown(e, chat.id)
                                }
                                onClick={(e) => e.stopPropagation()}
                                autoFocus
                              />
                            ) : (
                              <>
                                <div className="cli-title">
                                  {chat.title || "New chat"}
                                </div>
                                <div className="cli-meta">
                                  {chat.messages.length > 0
                                    ? getPreview(chat.messages[0].content)
                                    : "No messages"}
                                  {" · "}
                                  {formatDate(chat.updatedAt)}
                                </div>
                              </>
                            )}
                          </div>
                          <ChatMenu
                            onStar={() => handleStar(chat.id)}
                            onRename={() => handleRename(chat)}
                            onDelete={() => handleDelete(chat.id)}
                            isSaved={chat.saved}
                          />
                        </div>
                      ))}
                    </>
                  )}

                  {/* Saved section */}
                  {savedChats.filter((c) => !starredChats.includes(c)).length >
                    0 && (
                    <>
                      <div className="chats-section-header">
                        <span
                          className="chats-section-label"
                          style={{
                            color:
                              "rgba(var(--acc-r),var(--acc-g),var(--acc-b),.8)",
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                          }}
                        >
                          <Bookmark size={9} />
                          Saved
                        </span>
                        <span className="chats-section-info">Kept forever</span>
                      </div>
                      {savedChats
                        .filter((c) => !starredChats.includes(c))
                        .map((chat) => (
                          <div
                            key={chat.id}
                            className={`chat-list-item ${selectedIds.has(chat.id) ? "selected" : ""} ${activeChatId === chat.id ? "active-chat" : ""}`}
                            onClick={() => handleChatClick(chat.id)}
                          >
                            <div
                              className="chat-cb"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleChatClick(chat.id);
                              }}
                            >
                              {selectedIds.has(chat.id) && <Check size={10} />}
                            </div>
                            <div
                              className="cli-content"
                              style={{ flex: 1, minWidth: 0 }}
                            >
                              {editingId === chat.id ? (
                                <input
                                  type="text"
                                  className="cli-edit-input"
                                  value={editingName}
                                  onChange={(e) =>
                                    setEditingName(e.target.value)
                                  }
                                  onBlur={() => handleRenameSubmit(chat.id)}
                                  onKeyDown={(e) =>
                                    handleRenameKeyDown(e, chat.id)
                                  }
                                  onClick={(e) => e.stopPropagation()}
                                  autoFocus
                                />
                              ) : (
                                <>
                                  <div className="cli-title">
                                    {chat.title || "New chat"}
                                  </div>
                                  <div className="cli-meta">
                                    {chat.messages.length > 0
                                      ? getPreview(chat.messages[0].content)
                                      : "No messages"}
                                    {" · "}
                                    {formatDate(chat.updatedAt)}
                                  </div>
                                </>
                              )}
                            </div>
                            <ChatMenu
                              onStar={() => handleStar(chat.id)}
                              onRename={() => handleRename(chat)}
                              onDelete={() => handleDelete(chat.id)}
                              isSaved={chat.saved}
                            />
                          </div>
                        ))}
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div
          className="modal-overlay"
          onClick={cancelDelete}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "var(--sf)",
              border: "1px solid var(--bd2)",
              borderRadius: "var(--r-lg)",
              padding: 24,
              width: "100%",
              maxWidth: 460,
              animation: "up .14s ease",
            }}
          >
            <div style={{ marginBottom: 20 }}>
              <div
                style={{
                  fontSize: "calc(var(--fs) + 2px)",
                  fontWeight: 600,
                  color: "var(--tx)",
                  marginBottom: 8,
                }}
              >
                Delete {selectedIds.size} chat{selectedIds.size > 1 ? "s" : ""}?
              </div>
              <div
                style={{
                  fontSize: "calc(var(--fs) - 1px)",
                  color: "var(--tx3)",
                  lineHeight: 1.5,
                }}
              >
                This action cannot be undone. All messages in{" "}
                {selectedIds.size > 1 ? "these chats" : "this chat"} will be
                permanently deleted.
              </div>
            </div>
            <div
              style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}
            >
              <button className="btn btn-sm" onClick={cancelDelete}>
                Cancel
              </button>
              <button
                className="btn btn-sm"
                onClick={confirmDelete}
                style={{
                  background: "var(--danger)",
                  color: "white",
                  borderColor: "var(--danger)",
                }}
              >
                Delete {selectedIds.size > 1 ? "chats" : "chat"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
