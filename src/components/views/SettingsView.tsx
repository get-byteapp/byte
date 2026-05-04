import { useState } from "react";
import {
  ArrowLeft,
  Eye,
  EyeOff,
  RefreshCw,
  Trash2,
  Search,
  Folder,
  Zap,
  Network,
  Check,
  X,
  Plus,
  Pen,
} from "lucide-react";
import { useStore } from "../../store/useStore";
import {
  fetchModels,
  getDisplayName,
  formatContextWindow,
  makeModelKey,
} from "../../lib/api";
import type { Provider, Model } from "../../types";

const AVAILABLE_PROVIDERS = [
  { id: "openai", name: "OpenAI" },
  { id: "anthropic", name: "Anthropic (Claude)" },
  { id: "google", name: "Google Gemini" },
  { id: "mistral", name: "Mistral" },
  { id: "together", name: "Together AI" },
  { id: "groq", name: "Groq" },
  { id: "huggingface", name: "HuggingFace" },
  { id: "perplexity", name: "Perplexity" },
  { id: "openrouter", name: "OpenRouter" },
  { id: "fireworks", name: "Fireworks AI" },
  { id: "replicate", name: "Replicate" },
  { id: "aleph-alpha", name: "Aleph Alpha" },
  { id: "ollama", name: "Local (Ollama)" },
  { id: "lmstudio", name: "Local (LM Studio)" },
  { id: "cerebras", name: "Cerebras" },
];

export function SettingsView() {
  const [showProviderModal, setShowProviderModal] = useState(false);
  const {
    settingsSection,
    setSettingsSection,
    providers,
    addProvider,
    removeProvider,
    setProviderModels,
    enabledModelIds,
    toggleModel,
    disappearingMessages,
    setDisappearingMessages,
    disappearingInterval,
    setDisappearingInterval,
    streamingEnabled,
    setStreamingEnabled,
    clearAllChats,
    clearAllData,
  } = useStore();

  return (
    <div className="view on" style={{ flexDirection: "column" }}>
      <div className="cust-lay">
        <div className="cust-inner">
          <nav className="cust-snav">
            <button
              className={`cust-si ${settingsSection === "models" ? "on" : ""}`}
              onClick={() => setSettingsSection("models")}
            >
              Models
            </button>
            <button
              className={`cust-si ${settingsSection === "tabs" ? "on" : ""}`}
              onClick={() => setSettingsSection("tabs")}
            >
              Tabs
            </button>
            <button
              className={`cust-si ${settingsSection === "storage" ? "on" : ""}`}
              onClick={() => setSettingsSection("storage")}
            >
              Storage
            </button>
            <button
              className={`cust-si ${settingsSection === "general" ? "on" : ""}`}
              onClick={() => setSettingsSection("general")}
            >
              Preferences
            </button>
            <button
              className={`cust-si ${settingsSection === "database" ? "on" : ""}`}
              onClick={() => setSettingsSection("database")}
            >
              Database
            </button>
            <button
              className={`cust-si ${settingsSection === "connections" ? "on" : ""}`}
              onClick={() => setSettingsSection("connections")}
            >
              Connections
            </button>
            <button
              className={`cust-si ${settingsSection === "about" ? "on" : ""}`}
              onClick={() => setSettingsSection("about")}
            >
              About
            </button>
          </nav>
          <div className="cust-body">
            {settingsSection === "models" && (
              <ModelsPanel
                providers={providers}
                onAddProviderClick={() => setShowProviderModal(true)}
                onRemoveProvider={removeProvider}
                onToggleModel={toggleModel}
                enabledModelIds={enabledModelIds}
              />
            )}
            {settingsSection === "tabs" && <TabsPanel />}
            {settingsSection === "storage" && (
              <StoragePanel
                disappearingMessages={disappearingMessages}
                disappearingInterval={disappearingInterval}
                onDisappearingChange={setDisappearingMessages}
                onIntervalChange={setDisappearingInterval}
                onClearChats={clearAllChats}
                onResetEverything={clearAllData}
              />
            )}
            {settingsSection === "general" && (
              <GeneralPanel
                streamingEnabled={streamingEnabled}
                onStreamingChange={setStreamingEnabled}
              />
            )}
            {settingsSection === "database" && <DatabasePanel />}
            {settingsSection === "connections" && <ConnectionsPanel />}
            {settingsSection === "about" && <AboutPanel />}
          </div>
        </div>
      </div>

      {showProviderModal && (
        <ProviderModal
          availableProviders={AVAILABLE_PROVIDERS}
          existingProviders={providers}
          onAddProvider={addProvider}
          onFetchModels={async (provider) => {
            try {
              const models = await fetchModels(provider);
              setProviderModels(provider.id, models);
              return models;
            } catch (e) {
              // Error handling is done in the modal
              return [];
            }
          }}
          onClose={() => setShowProviderModal(false)}
        />
      )}
    </div>
  );
}

function ProviderModal({
  availableProviders,
  existingProviders,
  onAddProvider,
  onFetchModels,
  onClose,
}: {
  availableProviders: { id: string; name: string }[];
  existingProviders: Provider[];
  onAddProvider: (p: Provider) => void;
  onFetchModels: (p: Provider) => Promise<Model[]>;
  onClose: () => void;
}) {
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [search, setSearch] = useState("");

  const unusedProviders = availableProviders.filter(
    (p) => !existingProviders.find((ep) => ep.id === p.id),
  );

  const filteredProviders = search
    ? unusedProviders.filter((p) =>
        p.name.toLowerCase().includes(search.toLowerCase()),
      )
    : unusedProviders;

  const providerBaseUrls: Record<string, string> = {
    openai: "https://api.openai.com/v1",
    anthropic: "https://api.anthropic.com/v1",
    google: "https://generativelanguage.googleapis.com",
    mistral: "https://api.mistral.ai/v1",
    together: "https://api.together.xyz/v1",
    groq: "https://api.groq.com/openai/v1",
    huggingface: "https://api-inference.huggingface.co",
    perplexity: "https://api.perplexity.ai/openai/v1",
    openrouter: "https://openrouter.ai/api/v1",
    fireworks: "https://api.fireworks.ai/inference/v1",
    replicate: "https://api.replicate.com/v1",
    "aleph-alpha": "https://api.aleph-alpha.com/v1",
    ollama: "http://localhost:11434/v1",
    lmstudio: "http://localhost:1234/v1",
    cerebras: "https://api.cerebras.ai/v1",
  };

  const handleAdd = async () => {
    if (!selectedProvider || !apiKey.trim()) return;

    const providerInfo = availableProviders.find(
      (p) => p.id === selectedProvider,
    );
    if (!providerInfo) return;

    setLoading(true);
    setError("");

    const newProvider: Provider = {
      id: selectedProvider,
      name: providerInfo.name,
      apiKey: apiKey,
      baseUrl: baseUrl || providerBaseUrls[selectedProvider] || "",
      models: [],
    };

    try {
      const models = await onFetchModels(newProvider);
      newProvider.models = models;
      onAddProvider(newProvider);
      onClose();
    } catch (e) {
      setError("Failed to fetch models. Please check your API key.");
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        style={{
          background: "var(--sf)",
          border: "1px solid var(--bd2)",
          borderRadius: "var(--r-lg)",
          padding: 24,
          width: "100%",
          maxWidth: 460,
          animation: "up .14s ease",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ marginBottom: 20 }}>
          <div
            style={{
              fontSize: "calc(var(--fs) + 2px)",
              fontWeight: 600,
              color: "var(--tx)",
              marginBottom: 4,
            }}
          >
            Add Provider
          </div>
          <div
            style={{ fontSize: "calc(var(--fs) - 1px)", color: "var(--tx3)" }}
          >
            Select a provider to add
          </div>
        </div>

        {!selectedProvider ? (
          <>
            <div style={{ position: "relative", marginBottom: 16 }}>
              <Search
                size={14}
                style={{
                  position: "absolute",
                  left: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "var(--tx3)",
                  pointerEvents: "none",
                }}
              />
              <input
                type="text"
                placeholder="Search providers..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px 12px 10px 36px",
                  background: "var(--sf2)",
                  border: "1px solid var(--bd)",
                  borderRadius: "var(--r-sm)",
                  fontSize: "calc(var(--fs) - 1px)",
                  color: "var(--tx)",
                  outline: "none",
                  fontFamily: "var(--font)",
                }}
              />
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 6,
                marginBottom: 20,
                maxHeight: 300,
                overflowY: "auto",
                overflowX: "hidden",
              }}
            >
              {filteredProviders.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setSelectedProvider(p.id)}
                  style={{
                    padding: "14px 16px",
                    background: "var(--sf)",
                    border: "1px solid var(--bd)",
                    borderRadius: "var(--r-sm)",
                    color: "var(--tx)",
                    fontSize: "calc(var(--fs))",
                    cursor: "pointer",
                    textAlign: "left",
                    transition: "all 0.15s ease-out",
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    fontWeight: 500,
                    overflow: "hidden",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "var(--sf3)";
                    e.currentTarget.style.borderColor = "var(--acc)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "var(--sf)";
                    e.currentTarget.style.borderColor = "var(--bd)";
                  }}
                >
                  <div
                    style={{
                      flex: 1,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {p.name}
                  </div>
                  <div
                    style={{
                      color: "var(--tx3)",
                      fontSize: "calc(var(--fs) - 2px)",
                    }}
                  >
                    →
                  </div>
                </button>
              ))}
              {filteredProviders.length === 0 && (
                <div
                  style={{
                    padding: 24,
                    textAlign: "center",
                    color: "var(--tx3)",
                    fontSize: "calc(var(--fs) - 1px)",
                  }}
                >
                  No providers found
                </div>
              )}
            </div>
          </>
        ) : (
          <div style={{ marginBottom: 20 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 16,
              }}
            >
              <button
                onClick={() => setSelectedProvider(null)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--tx3)",
                }}
              >
                <ArrowLeft size={16} />
              </button>
              <span
                style={{
                  fontSize: "calc(var(--fs) - .5px)",
                  color: "var(--tx)",
                  fontWeight: 500,
                }}
              >
                {
                  availableProviders.find((p) => p.id === selectedProvider)
                    ?.name
                }
              </span>
            </div>
            {selectedProvider === "ollama" ||
            selectedProvider === "lmstudio" ? (
              <div
                style={{
                  padding: 16,
                  background: "var(--sf2)",
                  borderRadius: "var(--r-sm)",
                  marginBottom: 16,
                }}
              >
                <div
                  style={{
                    fontSize: "calc(var(--fs) - 1px)",
                    color: "var(--tx2)",
                    marginBottom: 8,
                  }}
                >
                  No API key needed for local providers
                </div>
                <div
                  style={{
                    fontSize: "calc(var(--fs) - 2px)",
                    color: "var(--tx3)",
                    lineHeight: 1.6,
                  }}
                >
                  {selectedProvider === "ollama" &&
                    "Make sure Ollama is running with `ollama serve`"}
                  {selectedProvider === "lmstudio" &&
                    "Start the local server in LM Studio settings"}
                </div>
              </div>
            ) : (
              <div style={{ position: "relative", marginBottom: 8 }}>
                <input
                  type={showKey ? "text" : "password"}
                  className="ob-key"
                  placeholder="Enter API key..."
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                  style={{ width: "100%" }}
                />
                <button
                  style={{
                    position: "absolute",
                    right: 12,
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "var(--tx3)",
                  }}
                  onClick={() => setShowKey(!showKey)}
                >
                  {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            )}
            {selectedProvider !== "ollama" &&
              selectedProvider !== "lmstudio" &&
              selectedProvider !== "replicate" && (
                <div style={{ marginBottom: 12 }}>
                  <div
                    style={{
                      fontSize: "calc(var(--fs) - 2px)",
                      color: "var(--tx3)",
                      marginBottom: 4,
                    }}
                  >
                    API endpoint (optional)
                  </div>
                  <input
                    type="text"
                    placeholder={
                      providerBaseUrls[selectedProvider] || "https://..."
                    }
                    value={baseUrl}
                    onChange={(e) => setBaseUrl(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      background: "var(--sf2)",
                      border: "1px solid var(--bd)",
                      borderRadius: "var(--r-sm)",
                      fontSize: "calc(var(--fs) - 1px)",
                      color: "var(--tx)",
                      outline: "none",
                      fontFamily: "var(--font)",
                    }}
                  />
                </div>
              )}
            {error && (
              <div
                style={{
                  fontSize: "calc(var(--fs) - 1px)",
                  color: "#f76a6a",
                  marginBottom: 8,
                }}
              >
                {error}
              </div>
            )}
            <button
              className="btn btn-p"
              onClick={handleAdd}
              disabled={
                loading ||
                (selectedProvider !== "ollama" &&
                  selectedProvider !== "lmstudio" &&
                  !apiKey.trim())
              }
              style={{ width: "100%", opacity: loading ? 0.7 : 1 }}
            >
              {loading ? "Fetching models..." : "Add Provider"}
            </button>
          </div>
        )}

        <button
          onClick={onClose}
          style={{
            position: "absolute",
            top: 12,
            right: 12,
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "var(--tx3)",
            padding: 4,
          }}
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}

function ModelsPanel({
  providers,
  onAddProviderClick,
  onRemoveProvider,
  onToggleModel,
  enabledModelIds,
}: {
  providers: Provider[];
  onAddProviderClick: () => void;
  onRemoveProvider: (id: string) => void;
  onToggleModel: (id: string) => void;
  enabledModelIds: string[];
}) {
  const [search, setSearch] = useState("");

  const allModels = providers.flatMap((p) =>
    p.models.map((m) => ({ ...m, providerName: p.name })),
  );
  const filteredModels = search
    ? allModels.filter(
        (m) =>
          getDisplayName(m.id).toLowerCase().includes(search.toLowerCase()) &&
          (m.contextWindow || 0) >= 10000,
      )
    : allModels.filter((m) => (m.contextWindow || 0) >= 10000);
  const sortedModels = [...filteredModels].sort((a, b) => {
    const aEnabled = enabledModelIds.includes(a.id);
    const bEnabled = enabledModelIds.includes(b.id);
    if (aEnabled && !bEnabled) return -1;
    if (!aEnabled && bEnabled) return 1;
    return 0;
  });

  return (
    <div>
      <div className="set-h">Providers</div>
      {providers.map((p) => (
        <div key={p.id} className="prov-row">
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span className="prov-name">{p.name}</span>
              <span
                style={{
                  fontSize: "calc(var(--fs) - 2px)",
                  color: "var(--tx3)",
                }}
              >
                {p.models.length} model{p.models.length !== 1 ? "s" : ""}
              </span>
            </div>
          </div>
          <span className="prov-key">
            {p.apiKey ? `••••${p.apiKey.slice(-4)}` : "No key"}
          </span>
          <div className="prov-acts">
            <button className="btn-icon" title="Refresh">
              <RefreshCw size={12} />
            </button>
            <button
              className="btn-icon"
              title="Delete"
              onClick={() => onRemoveProvider(p.id)}
            >
              <Trash2 size={12} />
            </button>
          </div>
        </div>
      ))}
      <button
        className="btn btn-sm"
        style={{
          width: "100%",
          textAlign: "center",
          margin: "8px 0 22px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
        }}
        onClick={onAddProviderClick}
      >
        <Plus size={14} />
        Add provider
      </button>

      <div className="set-h">Available Models</div>
      <div style={{ position: "relative", marginBottom: 12 }}>
        <Search
          size={14}
          style={{
            position: "absolute",
            left: 12,
            top: "50%",
            transform: "translateY(-50%)",
            color: "var(--tx3)",
            pointerEvents: "none",
          }}
        />
        <input
          type="text"
          placeholder="Search models..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: "100%",
            padding: "9px 12px 9px 36px",
            background: "var(--sf)",
            border: "1px solid var(--bd)",
            borderRadius: "var(--r)",
            fontSize: "var(--fs)",
            color: "var(--tx)",
            fontFamily: "var(--font)",
            outline: "none",
          }}
        />
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 6,
          maxHeight: 400,
          overflowY: "auto",
        }}
      >
        {sortedModels.map((m) => (
          <label
            key={m.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "9px 12px",
              background: "var(--sf)",
              border: "1px solid var(--bd)",
              borderRadius: "var(--r)",
              cursor: "pointer",
              transition: "border-color var(--ease)",
            }}
          >
            <input
              type="checkbox"
              checked={enabledModelIds.includes(
                makeModelKey(m.providerId, m.id),
              )}
              onChange={() => onToggleModel(makeModelKey(m.providerId, m.id))}
              style={{ width: 16, height: 16, accentColor: "var(--acc)" }}
            />
            <div style={{ flex: 1 }}>
              <div
                style={{
                  fontSize: "calc(var(--fs) - .5px)",
                  color: "var(--tx)",
                }}
              >
                {getDisplayName(m.id)}
              </div>
              <div
                style={{
                  fontSize: "calc(var(--fs) - 2px)",
                  color: "var(--tx3)",
                }}
              >
                {m.contextWindow
                  ? `${formatContextWindow(m.contextWindow)} context`
                  : "N/A"}
              </div>
            </div>
            <span
              style={{ fontSize: "calc(var(--fs) - 2px)", color: "var(--tx4)" }}
            >
              {m.providerName}
            </span>
          </label>
        ))}
      </div>
      {providers.length === 0 && (
        <div style={{ textAlign: "center", padding: 40, color: "var(--tx3)" }}>
          No providers added yet. Add a provider to get started.
        </div>
      )}
    </div>
  );
}

function TabsPanel() {
  const [tabs, setTabs] = useState({
    council: true,
    sparks: true,
    projects: true,
  });

  return (
    <div>
      <div className="set-h">Optional tabs</div>
      <div className="set-row">
        <div>
          <div className="set-rl">Council</div>
          <div className="set-rsub">Multi-model discussion</div>
        </div>
        <button
          className={`tog ${tabs.council ? "on" : ""}`}
          onClick={() => setTabs({ ...tabs, council: !tabs.council })}
        />
      </div>
      <div className="set-row">
        <div>
          <div className="set-rl">Sparks</div>
          <div className="set-rsub">Saved AI visualizations</div>
        </div>
        <button
          className={`tog ${tabs.sparks ? "on" : ""}`}
          onClick={() => setTabs({ ...tabs, sparks: !tabs.sparks })}
        />
      </div>
      <div className="set-row" style={{ border: "none" }}>
        <div>
          <div className="set-rl">Projects</div>
          <div className="set-rsub">Group chats into folders</div>
        </div>
        <button
          className={`tog ${tabs.projects ? "on" : ""}`}
          onClick={() => setTabs({ ...tabs, projects: !tabs.projects })}
        />
      </div>
    </div>
  );
}

function StoragePanel({
  disappearingMessages,
  disappearingInterval,
  onDisappearingChange,
  onIntervalChange,
  onClearChats,
  onResetEverything,
}: {
  disappearingMessages: boolean;
  disappearingInterval: number;
  onDisappearingChange: (v: boolean) => void;
  onIntervalChange: (v: number) => void;
  onClearChats: () => void;
  onResetEverything: () => void;
}) {
  const [showCustom, setShowCustom] = useState(false);
  const [confirmAction, setConfirmAction] = useState<"clear" | "reset" | null>(
    null,
  );

  return (
    <div>
      <div className="set-h">Storage</div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 3,
          marginBottom: 18,
        }}
      >
        <div className="set-row">
          <div>
            <div className="set-rl">Chat history</div>
            <div className="set-rsub">Local SQLite database</div>
          </div>
          <span
            style={{ fontSize: "calc(var(--fs) - 2px)", color: "var(--tx3)" }}
          >
            142 MB
          </span>
        </div>
        <div className="set-row">
          <div>
            <div className="set-rl">Attachments &amp; files</div>
            <div className="set-rsub">Uploaded context files</div>
          </div>
          <span
            style={{ fontSize: "calc(var(--fs) - 2px)", color: "var(--tx3)" }}
          >
            38 MB
          </span>
        </div>
        <div className="set-row" style={{ border: "none" }}>
          <div>
            <div className="set-rl">Sparks cache</div>
            <div className="set-rsub">Saved AI visualizations</div>
          </div>
          <span
            style={{ fontSize: "calc(var(--fs) - 2px)", color: "var(--tx3)" }}
          >
            11 MB
          </span>
        </div>
      </div>

      <div className="set-h">Actions</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "10px 0",
            borderBottom: "1px solid var(--bd)",
          }}
        >
          <div>
            <div className="set-rl">Clear chat history</div>
            <div className="set-rsub">
              Deletes all conversations permanently
            </div>
          </div>
          <button
            className="btn btn-sm"
            onClick={() => setConfirmAction("clear")}
            style={{ color: "#e05555", borderColor: "rgba(224,85,85,.3)" }}
          >
            Clear
          </button>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "10px 0",
          }}
        >
          <div>
            <div className="set-rl">Reset everything</div>
            <div className="set-rsub">Wipe all data and settings</div>
          </div>
          <button
            className="btn btn-sm"
            onClick={() => setConfirmAction("reset")}
            style={{ color: "#e05555", borderColor: "rgba(224,85,85,.3)" }}
          >
            Reset
          </button>
        </div>
      </div>

      {confirmAction && (
        <div className="modal-overlay" onClick={() => setConfirmAction(null)}>
          <div className="modal modal-sm" onClick={(e) => e.stopPropagation()}>
            <h3>
              {confirmAction === "clear"
                ? "Clear Chat History?"
                : "Reset Everything?"}
            </h3>
            <p
              style={{
                color: "var(--tx2)",
                fontSize: "14px",
                marginTop: "8px",
                lineHeight: 1.5,
              }}
            >
              {confirmAction === "clear"
                ? "This will permanently delete all your chats and messages. This cannot be undone."
                : "This will delete ALL data including chats, memories, providers, and settings. This cannot be undone."}
            </p>
            <div className="modal-actions" style={{ marginTop: "24px" }}>
              <button
                type="button"
                className="modal-btn secondary"
                onClick={() => setConfirmAction(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="modal-btn danger"
                onClick={() => {
                  if (confirmAction === "clear") onClearChats();
                  else onResetEverything();
                  setConfirmAction(null);
                }}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="set-h" style={{ marginTop: 22 }}>
        Disappearing Chats
      </div>
      <div
        style={{
          padding: 12,
          background: "rgba(var(--acc-r),var(--acc-g),var(--acc-b),.06)",
          border: "1px solid rgba(var(--acc-r),var(--acc-g),var(--acc-b),.15)",
          borderRadius: "var(--r-sm)",
          marginBottom: 14,
        }}
      >
        <div
          style={{
            fontSize: "calc(var(--fs) - 1px)",
            color: "var(--tx2)",
            marginBottom: 4,
            fontWeight: 500,
          }}
        >
          Chats disappear after 48 hours
        </div>
        <div
          style={{
            fontSize: "calc(var(--fs) - 2px)",
            color: "var(--tx3)",
            lineHeight: 1.6,
          }}
        >
          Unsaved chats are automatically deleted — saving space and keeping
          your AI context lean. Bookmark any chat to keep it forever.
        </div>
      </div>
      <div className="set-row">
        <div>
          <div className="set-rl">Disappearing chats</div>
          <div className="set-rsub">
            Automatically delete unsaved chats after expiry
          </div>
        </div>
        <button
          className={`tog ${disappearingMessages ? "on" : ""}`}
          onClick={() => onDisappearingChange(!disappearingMessages)}
        />
      </div>
      {disappearingMessages && (
        <>
          <div className="set-row">
            <div>
              <div className="set-rl">Expiry window</div>
              <div className="set-rsub">
                How long before unsaved chats are removed
              </div>
            </div>
            <select
              value={disappearingInterval}
              onChange={(e) => {
                const val = Number(e.target.value);
                if (val === 999) {
                  setShowCustom(true);
                } else {
                  onIntervalChange(val);
                }
              }}
              style={{
                background: "var(--sf2)",
                border: "1px solid var(--bd)",
                borderRadius: "var(--r-sm)",
                padding: "5px 8px",
                fontSize: "calc(var(--fs) - 1.5px)",
                color: "var(--tx2)",
                outline: "none",
                fontFamily: "var(--font)",
              }}
            >
              <option value="24">24 hours</option>
              <option value="48">48 hours</option>
              <option value="72">72 hours</option>
              <option value="168">1 week</option>
              <option value="999">Custom…</option>
            </select>
          </div>
          {showCustom && (
            <div className="set-row" style={{ border: "none" }}>
              <div>
                <div className="set-rl">Custom duration</div>
                <div className="set-rsub">Enter number of hours</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <input
                  type="number"
                  min="1"
                  max="8760"
                  value={disappearingInterval}
                  style={{
                    width: 64,
                    background: "var(--sf2)",
                    border: "1px solid var(--bd)",
                    borderRadius: "var(--r-sm)",
                    padding: "5px 8px",
                    fontSize: "calc(var(--fs) - 1.5px)",
                    color: "var(--tx2)",
                    outline: "none",
                    fontFamily: "var(--font)",
                    textAlign: "right",
                  }}
                />
                <span
                  style={{
                    fontSize: "calc(var(--fs) - 1.5px)",
                    color: "var(--tx3)",
                  }}
                >
                  hours
                </span>
                <button
                  className="btn btn-sm"
                  onClick={() => setShowCustom(false)}
                >
                  Apply
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function GeneralPanel({
  streamingEnabled,
  onStreamingChange,
}: {
  streamingEnabled: boolean;
  onStreamingChange: (val: boolean) => void;
}) {
  const autoUpdateEnabled = useStore((s) => s.autoUpdateEnabled);
  const setAutoUpdateEnabled = useStore((s) => s.setAutoUpdateEnabled);
  const isMac = navigator.userAgent.toLowerCase().includes("mac");
  const [name, setName] = useState("");
  const [settings, setSettings] = useState({
    autoSave: true,
    telemetry: false,
    hardware: true,
  });

  return (
    <div>
      <div className="set-h">Your profile</div>
      <div className="set-row">
        <div style={{ flex: 1 }}>
          <div className="set-rl">Your name</div>
          <div className="set-rsub">
            Used in greetings and throughout the app
          </div>
        </div>
        <input
          type="text"
          placeholder="Enter your name…"
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={{
            width: 160,
            background: "var(--sf2)",
            border: "1px solid var(--bd)",
            borderRadius: "var(--r-sm)",
            padding: "7px 10px",
            fontSize: "calc(var(--fs) - 1px)",
            color: "var(--tx)",
            outline: "none",
            fontFamily: "var(--font)",
            transition: "border-color var(--ease)",
          }}
        />
      </div>

      <div className="set-h" style={{ marginTop: 18 }}>
        App behaviour
      </div>
      <div className="set-row">
        <div>
          <div className="set-rl">Stream responses</div>
          <div className="set-rsub">Show AI responses as they're generated</div>
        </div>
        <button
          className={`tog ${streamingEnabled ? "on" : ""}`}
          onClick={() => onStreamingChange(!streamingEnabled)}
        />
      </div>
      <div className="set-row">
        <div>
          <div className="set-rl">Auto-save conversations</div>
          <div className="set-rsub">Save chats automatically as you type</div>
        </div>
        <button
          className={`tog ${settings.autoSave ? "on" : ""}`}
          onClick={() =>
            setSettings({ ...settings, autoSave: !settings.autoSave })
          }
        />
      </div>
      <div className="set-row">
        <div>
          <div className="set-rl">Send telemetry</div>
          <div className="set-rsub">Anonymous usage stats to improve Byte</div>
        </div>
        <button
          className={`tog ${settings.telemetry ? "on" : ""}`}
          onClick={() =>
            setSettings({ ...settings, telemetry: !settings.telemetry })
          }
        />
      </div>
      <div className="set-row" style={{ opacity: isMac ? 0.5 : 1 }}>
        <div>
          <div className="set-rl">Auto-update</div>
          <div className="set-rsub">
            {isMac
              ? "Coming to macOS soon"
              : "Automatically download and install updates"}
          </div>
        </div>
        <div style={{ position: "relative" }}>
          <button
            className={`tog ${autoUpdateEnabled ? "on" : ""}`}
            onClick={() => !isMac && setAutoUpdateEnabled(!autoUpdateEnabled)}
            disabled={isMac}
            title={isMac ? "Coming to macOS soon" : ""}
          />
          {isMac && (
            <div
              style={{ position: "absolute", inset: 0 }}
              title="Coming to macOS soon"
            />
          )}
        </div>
      </div>
      <div className="set-row" style={{ border: "none" }}>
        <div>
          <div className="set-rl">Hardware acceleration</div>
          <div className="set-rsub">Use GPU for rendering when available</div>
        </div>
        <button
          className={`tog ${settings.hardware ? "on" : ""}`}
          onClick={() =>
            setSettings({ ...settings, hardware: !settings.hardware })
          }
        />
      </div>
    </div>
  );
}

function DatabasePanel() {
  return (
    <div>
      <div className="set-h">Database</div>
      <div
        style={{
          padding: 12,
          background: "var(--sf2)",
          border: "1px solid var(--bd)",
          borderRadius: "var(--r-sm)",
          marginBottom: 16,
          display: "flex",
          flexDirection: "column",
          gap: 6,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: "calc(var(--fs) - 1.5px)",
          }}
        >
          <span style={{ color: "var(--tx3)" }}>Engine</span>
          <span style={{ color: "var(--tx2)" }}>SQLite 3.45.1</span>
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: "calc(var(--fs) - 1.5px)",
          }}
        >
          <span style={{ color: "var(--tx3)" }}>Location</span>
          <span
            style={{ color: "var(--tx2)", fontSize: "calc(var(--fs) - 2.5px)" }}
          >
            ~/.byte/byte.db
          </span>
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: "calc(var(--fs) - 1.5px)",
          }}
        >
          <span style={{ color: "var(--tx3)" }}>Size</span>
          <span style={{ color: "var(--tx2)" }}>142 MB</span>
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: "calc(var(--fs) - 1.5px)",
          }}
        >
          <span style={{ color: "var(--tx3)" }}>Records</span>
          <span style={{ color: "var(--tx2)" }}>2,847 messages</span>
        </div>
      </div>
      <div className="set-h">Maintenance</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "10px 0",
            borderBottom: "1px solid var(--bd)",
          }}
        >
          <div>
            <div className="set-rl">Vacuum database</div>
            <div className="set-rsub">Reclaim unused space</div>
          </div>
          <button className="btn btn-sm">Run</button>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "10px 0",
          }}
        >
          <div>
            <div className="set-rl">Run integrity check</div>
            <div className="set-rsub">Verify database is healthy</div>
          </div>
          <button className="btn btn-sm">Check</button>
        </div>
      </div>
    </div>
  );
}

function ConnectionsPanel() {
  const {
    langSearchApiKey,
    setLangSearchApiKey,
    langSearchEnabled,
    setLangSearchEnabled,
  } = useStore();
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [keyInput, setKeyInput] = useState("");
  const [toggles, setToggles] = useState({
    localFiles: true,
    codeRunner: true,
  });

  const isConfigured = !!langSearchApiKey;
  const isActive = isConfigured && langSearchEnabled;

  const handleSaveKey = () => {
    const trimmed = keyInput.trim();
    if (!trimmed) return;
    setLangSearchApiKey(trimmed);
    setShowKeyModal(false);
  };

  const handleDeleteKey = () => {
    setLangSearchApiKey("");
    setLangSearchEnabled(false);
  };

  return (
    <div>
      <div className="set-h">Connections</div>
      <div
        style={{
          fontSize: "calc(var(--fs) - 2px)",
          color: "var(--tx3)",
          marginBottom: 14,
          lineHeight: 1.6,
        }}
      >
        Manage integrations and external services Byte can connect to.
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {/* Web Search row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "11px 12px",
            background: "var(--sf)",
            border: "1px solid var(--bd)",
            borderRadius: "var(--r-sm)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {/* Icon + status dot */}
            <div
              style={{
                position: "relative",
                width: 28,
                height: 28,
                borderRadius: 6,
                background: "var(--sf2)",
                border: "1px solid var(--bd)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--tx2)",
                flexShrink: 0,
              }}
            >
              <Search size={14} />
              {isConfigured && (
                <div
                  style={{
                    position: "absolute",
                    bottom: -3,
                    right: -3,
                    width: 9,
                    height: 9,
                    borderRadius: "50%",
                    background: isActive ? "#4ade80" : "var(--tx4)",
                    border: "1.5px solid var(--sf)",
                  }}
                />
              )}
            </div>
            <div>
              <div className="set-rl" style={{ margin: 0 }}>
                Web Search
              </div>
              <div className="set-rsub">
                {isConfigured
                  ? isActive
                    ? "LangSearch API · Active"
                    : "LangSearch API · Disabled"
                  : "Add a LangSearch API key to enable web search"}
              </div>
            </div>
          </div>

          {/* Right-side controls — always same width when key is configured */}
          {isConfigured ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                flexShrink: 0,
              }}
            >
              <button
                onClick={() => {
                  setKeyInput(langSearchApiKey);
                  setShowKeyModal(true);
                }}
                title="Edit API key"
                style={{
                  width: 26,
                  height: 26,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "transparent",
                  border: "1px solid var(--bd)",
                  borderRadius: "var(--r-sm)",
                  cursor: "pointer",
                  color: "var(--tx3)",
                  transition: "all var(--ease)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "var(--sf2)";
                  e.currentTarget.style.color = "var(--tx)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.color = "var(--tx3)";
                }}
              >
                <Pen size={11} />
              </button>
              <button
                onClick={handleDeleteKey}
                title="Remove API key"
                style={{
                  width: 26,
                  height: 26,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "transparent",
                  border: "1px solid var(--bd)",
                  borderRadius: "var(--r-sm)",
                  cursor: "pointer",
                  color: "var(--tx3)",
                  transition: "all var(--ease)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "var(--danger-bg)";
                  e.currentTarget.style.color = "var(--danger)";
                  e.currentTarget.style.borderColor = "var(--danger-border)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.color = "var(--tx3)";
                  e.currentTarget.style.borderColor = "var(--bd)";
                }}
              >
                <Trash2 size={11} />
              </button>
              <button
                className={`tog${langSearchEnabled ? " on" : ""}`}
                onClick={() => setLangSearchEnabled(!langSearchEnabled)}
                style={{ marginLeft: 4 }}
              />
            </div>
          ) : (
            <button
              className="btn btn-sm"
              onClick={() => {
                setKeyInput("");
                setShowKeyModal(true);
              }}
              title="Add LangSearch API key"
              style={{ display: "flex", alignItems: "center", gap: 4 }}
            >
              <Plus size={14} />
            </button>
          )}
        </div>

        {/* API Key Modal */}
        {showKeyModal && (
          <div className="modal-overlay" onClick={() => setShowKeyModal(false)}>
            <div
              style={{
                position: "relative",
                background: "var(--sf)",
                border: "1px solid var(--bd2)",
                borderRadius: "var(--r-lg)",
                padding: 24,
                width: "100%",
                maxWidth: 460,
                animation: "up .14s ease",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setShowKeyModal(false)}
                style={{
                  position: "absolute",
                  top: 12,
                  right: 12,
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--tx3)",
                  padding: 4,
                  display: "flex",
                  alignItems: "center",
                  borderRadius: "var(--r-sm)",
                }}
              >
                <X size={16} />
              </button>

              <div style={{ marginBottom: 20 }}>
                <div
                  style={{
                    fontSize: "calc(var(--fs) + 2px)",
                    fontWeight: 600,
                    color: "var(--tx)",
                    marginBottom: 4,
                  }}
                >
                  {langSearchApiKey
                    ? "Edit LangSearch API Key"
                    : "Add LangSearch API Key"}
                </div>
                <div
                  style={{
                    fontSize: "calc(var(--fs) - 1px)",
                    color: "var(--tx3)",
                  }}
                >
                  Get a free key at{" "}
                  <a
                    href="https://langsearch.com/dashboard"
                    target="_blank"
                    rel="noreferrer"
                    style={{ color: "var(--acc)", textDecoration: "none" }}
                  >
                    langsearch.com/dashboard
                  </a>
                  . No credit card required.
                </div>
              </div>

              <div style={{ marginBottom: 16 }}>
                <div
                  style={{
                    fontSize: "calc(var(--fs) - 2px)",
                    color: "var(--tx3)",
                    marginBottom: 6,
                  }}
                >
                  API Key
                </div>
                <input
                  type="password"
                  className="ob-key"
                  placeholder="Enter LangSearch API key..."
                  value={keyInput}
                  onChange={(e) => setKeyInput(e.target.value)}
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && keyInput.trim()) handleSaveKey();
                  }}
                  style={{ width: "100%", marginBottom: 12 }}
                />
                <button
                  className="btn btn-p"
                  disabled={!keyInput.trim()}
                  style={{ width: "100%" }}
                  onClick={handleSaveKey}
                >
                  {langSearchApiKey ? "Update Key" : "Save Key"}
                </button>
              </div>
            </div>
          </div>
        )}

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "11px 12px",
            background: "var(--sf)",
            border: "1px solid var(--bd)",
            borderRadius: "var(--r-sm)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 6,
                background: "var(--sf2)",
                border: "1px solid var(--bd)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--tx2)",
              }}
            >
              <Folder size={14} />
            </div>
            <div>
              <div className="set-rl" style={{ margin: 0 }}>
                Local Files
              </div>
              <div className="set-rsub">Read files from your machine</div>
            </div>
          </div>
          <button
            className={`tog ${toggles.localFiles ? "on" : ""}`}
            onClick={() =>
              setToggles({ ...toggles, localFiles: !toggles.localFiles })
            }
          />
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "11px 12px",
            background: "var(--sf)",
            border: "1px solid var(--bd)",
            borderRadius: "var(--r-sm)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 6,
                background: "var(--sf2)",
                border: "1px solid var(--bd)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--tx2)",
              }}
            >
              <Zap size={14} />
            </div>
            <div>
              <div className="set-rl" style={{ margin: 0 }}>
                Code Runner
              </div>
              <div className="set-rsub">Execute code in sandboxed env</div>
            </div>
          </div>
          <button
            className={`tog ${toggles.codeRunner ? "on" : ""}`}
            onClick={() =>
              setToggles({ ...toggles, codeRunner: !toggles.codeRunner })
            }
          />
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "11px 12px",
            background: "var(--sf)",
            border: "1px solid var(--bd)",
            borderRadius: "var(--r-sm)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 6,
                background: "var(--sf2)",
                border: "1px solid var(--bd)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--tx2)",
              }}
            >
              <Network size={14} />
            </div>
            <div>
              <div className="set-rl" style={{ margin: 0 }}>
                MCP Servers
              </div>
              <div className="set-rsub">
                Model context protocol integrations
              </div>
            </div>
          </div>
          <button className="btn btn-sm">Manage</button>
        </div>
      </div>
    </div>
  );
}

function AboutPanel() {
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [updStatus, setUpdStatus] = useState<string | null>(null);

  const handleCheckUpdate = async () => {
    setCheckingUpdate(true);
    setUpdStatus(null);
    try {
      const { check } = await import("@tauri-apps/plugin-updater");
      const update = await check();
      if (update?.version) {
        setUpdStatus(`Version ${update.version} available`);
      } else {
        setUpdStatus("You're up to date!");
      }
    } catch {
      setUpdStatus("Check failed — open github.com/usebyte/byte/releases");
    }
    setCheckingUpdate(false);
  };

  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          padding: "20px 0 24px",
          borderBottom: "1px solid var(--bd)",
          marginBottom: 24,
        }}
      >
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 10,
            background: "rgba(var(--acc-r),var(--acc-g),var(--acc-b),.15)",
            border:
              "1px solid rgba(var(--acc-r),var(--acc-g),var(--acc-b),.25)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <span
            style={{
              fontSize: "calc(var(--fs) + 9px)",
              fontWeight: 800,
              letterSpacing: "-.04em",
              color: "var(--acc)",
              lineHeight: 1,
            }}
          >
            B
          </span>
        </div>
        <div>
          <div
            style={{
              fontSize: "calc(var(--fs) + 3px)",
              fontWeight: 600,
              color: "var(--tx)",
              letterSpacing: "-.02em",
              marginBottom: 3,
            }}
          >
            Byte
          </div>
          <div
            style={{
              fontSize: "calc(var(--fs) - 2px)",
              color: "var(--tx3)",
              letterSpacing: ".04em",
            }}
          >
            Version 0.1.0
          </div>
        </div>
      </div>
      <div style={{ marginBottom: 24 }}>
        <button
          className="btn btn-sm"
          onClick={handleCheckUpdate}
          disabled={checkingUpdate}
        >
          {checkingUpdate ? "Checking..." : "Check for Updates"}
        </button>
        {updStatus && (
          <span
            style={{
              marginLeft: 12,
              fontSize: "calc(var(--fs) - 1px)",
              color: "var(--tx3)",
            }}
          >
            {updStatus}
          </span>
        )}
      </div>

      <div className="set-h">What is Byte?</div>
      <p
        style={{
          fontSize: "calc(var(--fs) - .5px)",
          color: "var(--tx2)",
          lineHeight: 1.8,
          marginBottom: 14,
        }}
      >
        Byte is a personal AI workspace that lets you chat with the world's best
        language models — all from one clean, customisable interface. Connect
        your own API keys, pick any model, and get things done without switching
        between a dozen different apps.
      </p>
      <p
        style={{
          fontSize: "calc(var(--fs) - .5px)",
          color: "var(--tx2)",
          lineHeight: 1.8,
          marginBottom: 24,
        }}
      >
        Everything runs locally in your browser. Your keys, conversations, and
        memories never leave your device unless you explicitly export them.
      </p>

      <div className="set-h">What you can do</div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 8,
          marginBottom: 24,
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
          <Check
            size={14}
            style={{ flexShrink: 0, marginTop: 3, color: "var(--acc)" }}
          />
          <div
            style={{
              fontSize: "calc(var(--fs) - .5px)",
              color: "var(--tx2)",
              lineHeight: 1.6,
            }}
          >
            Chat with GPT-4o, Claude, Gemini, and 200+ models via OpenRouter
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
          <Check
            size={14}
            style={{ flexShrink: 0, marginTop: 3, color: "var(--acc)" }}
          />
          <div
            style={{
              fontSize: "calc(var(--fs) - .5px)",
              color: "var(--tx2)",
              lineHeight: 1.6,
            }}
          >
            Create custom AI agents with unique personalities and tools
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
          <Check
            size={14}
            style={{ flexShrink: 0, marginTop: 3, color: "var(--acc)" }}
          />
          <div
            style={{
              fontSize: "calc(var(--fs) - .5px)",
              color: "var(--tx2)",
              lineHeight: 1.6,
            }}
          >
            Organize chats into projects with shared system prompts
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
          <Check
            size={14}
            style={{ flexShrink: 0, marginTop: 3, color: "var(--acc)" }}
          />
          <div
            style={{
              fontSize: "calc(var(--fs) - .5px)",
              color: "var(--tx2)",
              lineHeight: 1.6,
            }}
          >
            Build and share custom prompt templates ("Skills")
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
          <Check
            size={14}
            style={{ flexShrink: 0, marginTop: 3, color: "var(--acc)" }}
          />
          <div
            style={{
              fontSize: "calc(var(--fs) - .5px)",
              color: "var(--tx2)",
              lineHeight: 1.6,
            }}
          >
            Search your entire chat history with semantic recall
          </div>
        </div>
      </div>

      <div className="set-h">Keyboard shortcuts</div>
      <table className="sc-table">
        <tbody>
          <tr>
            <td>New chat</td>
            <td>
              <span className="kbd">⌘</span> <span className="kbd">N</span>
            </td>
          </tr>
          <tr>
            <td>Search</td>
            <td>
              <span className="kbd">⌘</span> <span className="kbd">F</span>
            </td>
          </tr>
          <tr>
            <td>Toggle sidebar</td>
            <td>
              <span className="kbd">⌘</span> <span className="kbd">\</span>
            </td>
          </tr>
          <tr>
            <td>Settings</td>
            <td>
              <span className="kbd">⌘</span> <span className="kbd">,</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
