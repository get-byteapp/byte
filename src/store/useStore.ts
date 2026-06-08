import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  ThemeId,
  LayoutMode,
  ActiveView,
  Provider,
  Model,
  Chat,
  ChatConfig,
  ResponseStyleId,
  SettingsSection,
  Project,
  ProjectFile,
} from "../types";
import { getDefaultChatConfig } from "../lib/prompts";
import type { ToolId } from "../types";
import type { QuickPromptCategory } from "../lib/quickPrompts";
import { DEFAULT_QUICK_PROMPTS } from "../lib/quickPrompts";
import type { Skill } from "../types";

interface AppState {
  // Theme
  theme: ThemeId;
  layoutMode: LayoutMode;
  fontFamily: string;
  headingFont: string;

  // Providers & Models
  providers: Provider[];
  enabledModelIds: string[];
  selectedModelId: string | null;

  // Chats
  chats: Chat[];
  activeChatId: string | null;
  activeView: ActiveView;

  // Settings
  disappearingMessages: boolean;
  disappearingInterval: number;
  defaultResponseStyle: ResponseStyleId;
  defaultMemoryEnabled: boolean;
  defaultWebSearchEnabled: boolean;
  defaultCodeExecutionEnabled: boolean;

  // Memories
  memories: { id: string; name: string; content: string; createdAt: number }[];

  // Web Search API Key
  langSearchApiKey: string;
  langSearchEnabled: boolean;
  imageDescriptionModelId: string | null;
  setImageDescriptionModelId: (id: string | null) => void;

  // OCR Settings
  activeOcrEngineId: string | null;
  ocrApiConfigs: Record<string, { apiKey: string; endpoint?: string }>;
  setActiveOcrEngineId: (id: string | null) => void;
  setOcrApiConfig: (engineId: string, config: { apiKey: string; endpoint?: string }) => void;
  removeOcrApiConfig: (engineId: string) => void;

  // Vision Default Mode
  visionDefaultMode: "changeable" | "vision" | "ocr" | "describe";
  setVisionDefaultMode: (
    mode: "changeable" | "vision" | "ocr" | "describe",
  ) => void;

  // Disable attachment mode swap button
  disableAttachmentSwap: boolean;
  setDisableAttachmentSwap: (disabled: boolean) => void;

  // Quick Prompts
  quickPrompts: QuickPromptCategory[];

  // Projects
  projects: Project[];
  activeProjectId: string | null;

  // Skills
  skills: Skill[];

  // Actions
  setTheme: (theme: ThemeId) => void;
  setLayoutMode: (mode: LayoutMode) => void;
  setFontFamily: (font: string) => void;
  setHeadingFont: (font: string) => void;
  addProvider: (provider: Provider) => void;
  updateProvider: (id: string, updates: Partial<Provider>) => void;
  removeProvider: (id: string) => void;
  setProviderModels: (providerId: string, models: Model[]) => void;
  toggleModel: (modelId: string) => void;
  setSelectedModelId: (id: string | null) => void;
  addChat: (chat: Chat) => void;
  updateChat: (id: string, updates: Partial<Chat>) => void;
  removeChat: (id: string) => void;
  clearAllChats: () => void;
  clearAllData: () => void;
  setActiveChatId: (id: string | null) => void;
  setActiveView: (view: ActiveView) => void;
  settingsSection: SettingsSection;
  setSettingsSection: (section: SettingsSection) => void;
  newChat: (initialMessage?: string, config?: Partial<ChatConfig>) => string;
  setDisappearingMessages: (val: boolean) => void;
  setDisappearingInterval: (hours: number) => void;
  toggleSaved: (id: string) => void;
  streamingEnabled: boolean;
  setStreamingEnabled: (val: boolean) => void;
  setDefaultResponseStyle: (style: ResponseStyleId) => void;
  setDefaultMemoryEnabled: (enabled: boolean) => void;
  setDefaultWebSearchEnabled: (enabled: boolean) => void;
  setDefaultCodeExecutionEnabled: (enabled: boolean) => void;
  setLangSearchApiKey: (key: string) => void;
  setLangSearchEnabled: (enabled: boolean) => void;
  addMemory: (memory: { name: string; content: string }) => void;
  updateMemory: (
    id: string,
    updates: { name?: string; content?: string },
  ) => void;
  removeMemory: (id: string) => void;

  // Quick Prompts Actions
  setQuickPrompts: (prompts: QuickPromptCategory[]) => void;
  addQuickPromptCategory: (category: Omit<QuickPromptCategory, "id">) => void;
  updateQuickPromptCategory: (
    id: string,
    updates: Partial<QuickPromptCategory>,
  ) => void;
  removeQuickPromptCategory: (id: string) => void;
  addQuickPrompt: (
    categoryId: string,
    name: string,
    prompt: string,
    placeholders?: { key: string; label: string }[],
  ) => void;
  updateQuickPrompt: (
    categoryId: string,
    promptId: string,
    updates: Partial<{
      name: string;
      prompt: string;
      placeholders: { key: string; label: string }[];
    }>,
  ) => void;
  removeQuickPrompt: (categoryId: string, promptId: string) => void;
  toggleQuickPromptCategory: (id: string) => void;
  reorderQuickPrompts: (fromIndex: number, toIndex: number) => void;

  // Projects Actions
  addProject: (
    project: Omit<Project, "id" | "createdAt" | "updatedAt">,
  ) => string;
  updateProject: (id: string, updates: Partial<Project>) => void;
  removeProject: (id: string) => void;
  archiveProject: (id: string) => void;
  unarchiveProject: (id: string) => void;
  addChatToProject: (projectId: string, chatId: string) => void;
  removeChatFromProject: (projectId: string, chatId: string) => void;
  setActiveProjectId: (id: string | null) => void;
  updateProjectInstructions: (id: string, instructions: string) => void;
  addProjectFile: (projectId: string, file: ProjectFile) => void;
  removeProjectFile: (projectId: string, fileId: string) => void;

  // Auto Update
  autoUpdateEnabled: boolean;
  setAutoUpdateEnabled: (val: boolean) => void;
  updateAvailable: {
    version: string;
    installing: boolean;
    installed: boolean;
    releaseNotes: string;
  } | null;
  setUpdateAvailable: (val: AppState["updateAvailable"]) => void;

  // Input Glow
  inputGlowEnabled: boolean;
  inputGlowColor: string;
  setInputGlowEnabled: (enabled: boolean) => void;
  setInputGlowColor: (color: string) => void;

  // Skills Actions
  setSkills: (skills: Skill[]) => void;
  addSkill: (skill: Omit<Skill, "id" | "createdAt">) => string;
  updateSkill: (id: string, updates: Partial<Skill>) => void;
  removeSkill: (id: string) => void;
}

// Migration function to handle old data format
const migrateQuickPrompts = (storedState: any): QuickPromptCategory[] => {
  // If no stored state or no quickPrompts, use defaults
  if (!storedState || !storedState.quickPrompts) {
    return DEFAULT_QUICK_PROMPTS;
  }

  const stored = storedState.quickPrompts;

  // Check if it's the old format (array of strings or malformed objects)
  const isOldFormat =
    Array.isArray(stored) &&
    stored.some((cat: any) => {
      // Old format: prompts were strings or had no id/name/prompt structure
      if (!cat.prompts || !Array.isArray(cat.prompts)) return true;
      return cat.prompts.some(
        (p: any) => typeof p === "string" || !p.id || !p.name || !p.prompt,
      );
    });

  if (isOldFormat) {
    console.log(
      "[Byte Store] Migrating quick prompts from old format to new format",
    );
    return DEFAULT_QUICK_PROMPTS;
  }

  // Check if categories are missing required fields
  const isMissingFields =
    Array.isArray(stored) &&
    stored.some((cat: any) => {
      return !cat.id || !cat.label || !cat.icon || !Array.isArray(cat.prompts);
    });

  if (isMissingFields) {
    console.log(
      "[Byte Store] Quick prompts missing required fields, resetting to defaults",
    );
    return DEFAULT_QUICK_PROMPTS;
  }

  return stored;
};

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      theme: "t-light",
      layoutMode: "full",
      fontFamily: "'Geist Mono',monospace",
      headingFont: "'Instrument Serif',serif",
      providers: [],
      enabledModelIds: [],
      selectedModelId: null,
      chats: [],
      activeChatId: null,
      activeView: "home",
      settingsSection: "models" as SettingsSection,
      disappearingMessages: true,
      disappearingInterval: 48,
      streamingEnabled: true,
      defaultResponseStyle: "normal",
      defaultMemoryEnabled: false,
      defaultWebSearchEnabled: false,
      defaultCodeExecutionEnabled: false,
      langSearchApiKey: "",
      langSearchEnabled: false,
      imageDescriptionModelId: null,
      activeOcrEngineId: null,
      ocrApiConfigs: {},
      visionDefaultMode: "changeable",
      disableAttachmentSwap: false,
      memories: [],
      quickPrompts: DEFAULT_QUICK_PROMPTS,
      projects: [],
      activeProjectId: null,
      skills: [],
      autoUpdateEnabled: true,
      updateAvailable: null,
      inputGlowEnabled: false,
      inputGlowColor: '#8c8c8c',

      setTheme: (theme) => set({ theme }),
      setLayoutMode: (layoutMode) => set({ layoutMode }),
      setFontFamily: (fontFamily) => set({ fontFamily }),
      setHeadingFont: (headingFont) => set({ headingFont }),
      addProvider: (provider) =>
        set((s) => ({ providers: [...s.providers, provider] })),
      updateProvider: (id, updates) =>
        set((s) => ({
          providers: s.providers.map((p) =>
            p.id === id ? { ...p, ...updates } : p,
          ),
        })),
      removeProvider: (id) =>
        set((s) => ({
          providers: s.providers.filter((p) => p.id !== id),
          enabledModelIds: s.enabledModelIds.filter(
            (mid) => !mid.startsWith(id + "::"),
          ),
        })),
      setProviderModels: (providerId, models) =>
        set((s) => ({
          providers: s.providers.map((p) =>
            p.id === providerId ? { ...p, models } : p,
          ),
        })),
      toggleModel: (modelId) =>
        set((s) => {
          const isEnabling = !s.enabledModelIds.includes(modelId);
          const newEnabledIds = isEnabling
            ? [...s.enabledModelIds, modelId]
            : s.enabledModelIds.filter((id) => id !== modelId);
          let newSelectedId = s.selectedModelId;
          if (isEnabling && s.selectedModelId === null) {
            newSelectedId = modelId;
          } else if (!isEnabling && s.selectedModelId === modelId) {
            newSelectedId = newEnabledIds.length > 0 ? newEnabledIds[0] : null;
          }
          return {
            enabledModelIds: newEnabledIds,
            selectedModelId: newSelectedId,
          };
        }),
      setSelectedModelId: (selectedModelId) => set({ selectedModelId }),
      addChat: (chat) => set((s) => ({ chats: [...s.chats, chat] })),
      updateChat: (id, updates) =>
        set((s) => ({
          chats: s.chats.map((c) =>
            c.id === id ? { ...c, ...updates, updatedAt: Date.now() } : c,
          ),
        })),
      removeChat: (id) =>
        set((s) => ({
          chats: s.chats.filter((c) => c.id !== id),
          activeChatId: s.activeChatId === id ? null : s.activeChatId,
          projects: s.projects.map((p) => ({
            ...p,
            chatIds: p.chatIds.filter((cid) => cid !== id),
          })),
        })),
      clearAllChats: () =>
        set({
          chats: [],
          activeChatId: null,
          activeView: "home",
        }),
      clearAllData: () => {
        localStorage.removeItem("byte_store");
        set({
          chats: [],
          activeChatId: null,
          activeView: "home",
          providers: [],
          enabledModelIds: [],
          selectedModelId: null,
          memories: [],
          projects: [],
          quickPrompts: DEFAULT_QUICK_PROMPTS,
          theme: "t-light",
          layoutMode: "full",
          fontFamily: "'Geist Mono',monospace",
          headingFont: "'Instrument Serif',serif",
          disappearingMessages: true,
          disappearingInterval: 48,
          streamingEnabled: true,
          defaultResponseStyle: "normal",
          defaultMemoryEnabled: false,
          defaultWebSearchEnabled: false,
          langSearchApiKey: "",
        });
      },
      setActiveChatId: (activeChatId) => set({ activeChatId }),
      setActiveView: (activeView) => set({ activeView }),
      setSettingsSection: (settingsSection) => set({ settingsSection }),
      newChat: (initialMessage?: string, config?: Partial<ChatConfig>) => {
        const defaultConfig = getDefaultChatConfig();
        defaultConfig.responseStyle = get().defaultResponseStyle;
        defaultConfig.memoryEnabled = get().defaultMemoryEnabled;
        defaultConfig.enabledTools = get().defaultWebSearchEnabled
          ? [...defaultConfig.enabledTools, "WEB_SEARCH" as ToolId]
          : defaultConfig.enabledTools.filter((t) => t !== "WEB_SEARCH");
        defaultConfig.enabledTools = get().defaultCodeExecutionEnabled
          ? [...defaultConfig.enabledTools.filter((t) => t !== "CODE_EXECUTION"), "CODE_EXECUTION" as ToolId]
          : defaultConfig.enabledTools.filter((t) => t !== "CODE_EXECUTION");
        const chat: Chat = {
          id: crypto.randomUUID(),
          title: initialMessage ? initialMessage.slice(0, 50) : "New chat",
          messages: [],
          modelId: get().selectedModelId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          saved: false,
          config: { ...defaultConfig, ...config },
        };
        const activeProjectId = get().activeProjectId;
        set({
          chats: [...get().chats, chat],
          activeChatId: chat.id,
          activeView: "chat",
          projects: activeProjectId
            ? get().projects.map((p) =>
                p.id === activeProjectId && !p.chatIds.includes(chat.id)
                  ? {
                      ...p,
                      chatIds: [...p.chatIds, chat.id],
                      updatedAt: Date.now(),
                    }
                  : p,
              )
            : get().projects,
        });
        return chat.id;
      },
      setDisappearingMessages: (disappearingMessages) =>
        set({ disappearingMessages }),
      setDisappearingInterval: (disappearingInterval) =>
        set({ disappearingInterval }),
      toggleSaved: (id) =>
        set((s) => ({
          chats: s.chats.map((c) =>
            c.id === id ? { ...c, saved: !c.saved, updatedAt: Date.now() } : c,
          ),
        })),
      setStreamingEnabled: (streamingEnabled) => set({ streamingEnabled }),
      setDefaultResponseStyle: (style: ResponseStyleId) =>
        set({ defaultResponseStyle: style }),
      setDefaultMemoryEnabled: (enabled: boolean) =>
        set({ defaultMemoryEnabled: enabled }),
      setDefaultWebSearchEnabled: (enabled: boolean) =>
        set({ defaultWebSearchEnabled: enabled }),
      setDefaultCodeExecutionEnabled: (enabled: boolean) =>
        set({ defaultCodeExecutionEnabled: enabled }),
      setLangSearchApiKey: (langSearchApiKey) =>
        set({ langSearchApiKey, langSearchEnabled: !!langSearchApiKey }),
      setLangSearchEnabled: (langSearchEnabled) => set({ langSearchEnabled }),
      setImageDescriptionModelId: (imageDescriptionModelId) =>
        set({ imageDescriptionModelId }),
        setActiveOcrEngineId: (activeOcrEngineId) => set({ activeOcrEngineId }),
        setOcrApiConfig: (engineId, config) =>
          set(state => ({ ocrApiConfigs: { ...state.ocrApiConfigs, [engineId]: config } })),
        removeOcrApiConfig: (engineId) =>
          set(state => {
            const next = { ...state.ocrApiConfigs }
            delete next[engineId]
            return { ocrApiConfigs: next }
          }),
       setVisionDefaultMode: (visionDefaultMode) => set({ visionDefaultMode }),
       setDisableAttachmentSwap: (disableAttachmentSwap) =>
         set({ disableAttachmentSwap }),
       addMemory: (memory) =>
        set((s) => ({
          memories: [
            ...s.memories,
            { id: crypto.randomUUID(), ...memory, createdAt: Date.now() },
          ],
        })),
      updateMemory: (id, updates) =>
        set((s) => ({
          memories: s.memories.map((m) =>
            m.id === id ? { ...m, ...updates } : m,
          ),
        })),
      removeMemory: (id) =>
        set((s) => ({
          memories: s.memories.filter((m) => m.id !== id),
        })),

      // Quick Prompts Actions
      setQuickPrompts: (quickPrompts) => set({ quickPrompts }),
      addQuickPromptCategory: (category) =>
        set((s) => ({
          quickPrompts: [
            ...s.quickPrompts,
            { ...category, id: crypto.randomUUID(), enabled: true },
          ],
        })),
      updateQuickPromptCategory: (id, updates) =>
        set((s) => {
          const updated = s.quickPrompts.map((c) =>
            c.id === id ? { ...c, ...updates } : c,
          );
          // Auto-sort: enabled first, then disabled
          const sorted = [...updated].sort((a, b) => {
            if (a.enabled === b.enabled) return 0;
            return a.enabled ? -1 : 1;
          });
          return { quickPrompts: sorted };
        }),
      removeQuickPromptCategory: (id) =>
        set((s) => ({
          quickPrompts: s.quickPrompts.filter((c) => c.id !== id),
        })),
      addQuickPrompt: (categoryId, name, prompt, placeholders) =>
        set((s) => ({
          quickPrompts: s.quickPrompts.map((c) =>
            c.id === categoryId
              ? {
                  ...c,
                  prompts: [
                    ...c.prompts,
                    { id: crypto.randomUUID(), name, prompt, placeholders },
                  ],
                }
              : c,
          ),
        })),
      updateQuickPrompt: (categoryId, promptId, updates) =>
        set((s) => ({
          quickPrompts: s.quickPrompts.map((c) =>
            c.id === categoryId
              ? {
                  ...c,
                  prompts: c.prompts.map((p) =>
                    p.id === promptId ? { ...p, ...updates } : p,
                  ),
                }
              : c,
          ),
        })),
      removeQuickPrompt: (categoryId, promptId) =>
        set((s) => ({
          quickPrompts: s.quickPrompts.map((c) =>
            c.id === categoryId
              ? { ...c, prompts: c.prompts.filter((p) => p.id !== promptId) }
              : c,
          ),
        })),
      toggleQuickPromptCategory: (id) =>
        set((s) => {
          const updated = s.quickPrompts.map((c) =>
            c.id === id ? { ...c, enabled: !c.enabled } : c,
          );
          // Auto-sort: enabled first, then disabled
          const sorted = [...updated].sort((a, b) => {
            if (a.enabled === b.enabled) return 0;
            return a.enabled ? -1 : 1;
          });
          return { quickPrompts: sorted };
        }),
      reorderQuickPrompts: (fromIndex, toIndex) =>
        set((s) => {
          const items = [...s.quickPrompts];
          const [moved] = items.splice(fromIndex, 1);
          items.splice(toIndex, 0, moved);
          // Re-sort to maintain enabled/disabled grouping
          const sorted = items.sort((a, b) => {
            if (a.enabled === b.enabled) return 0;
            return a.enabled ? -1 : 1;
          });
          return { quickPrompts: sorted };
        }),

      // Projects Actions
      addProject: (project) => {
        const id = crypto.randomUUID();
        set((s) => ({
          projects: [
            ...s.projects,
            {
              ...project,
              customInstructions: project.customInstructions || "",
              files: project.files || [],
              id,
              createdAt: Date.now(),
              updatedAt: Date.now(),
            },
          ],
        }));
        return id;
      },
      updateProject: (id, updates) =>
        set((s) => ({
          projects: s.projects.map((p) =>
            p.id === id ? { ...p, ...updates, updatedAt: Date.now() } : p,
          ),
        })),
      removeProject: (id) =>
        set((s) => ({
          projects: s.projects.filter((p) => p.id !== id),
        })),
      archiveProject: (id) =>
        set((s) => ({
          projects: s.projects.map((p) =>
            p.id === id
              ? { ...p, status: "archived", updatedAt: Date.now() }
              : p,
          ),
        })),
      unarchiveProject: (id) =>
        set((s) => ({
          projects: s.projects.map((p) =>
            p.id === id ? { ...p, status: "active", updatedAt: Date.now() } : p,
          ),
        })),
      addChatToProject: (projectId, chatId) =>
        set((s) => ({
          projects: s.projects.map((p) =>
            p.id === projectId && !p.chatIds.includes(chatId)
              ? { ...p, chatIds: [...p.chatIds, chatId], updatedAt: Date.now() }
              : p,
          ),
        })),
      removeChatFromProject: (projectId, chatId) =>
        set((s) => ({
          projects: s.projects.map((p) =>
            p.id === projectId
              ? {
                  ...p,
                  chatIds: p.chatIds.filter((id) => id !== chatId),
                  updatedAt: Date.now(),
                }
              : p,
          ),
        })),
      setActiveProjectId: (activeProjectId) => set({ activeProjectId }),
      updateProjectInstructions: (id, customInstructions) =>
        set((s) => ({
          projects: s.projects.map((p) =>
            p.id === id
              ? { ...p, customInstructions, updatedAt: Date.now() }
              : p,
          ),
        })),
      addProjectFile: (projectId, file) =>
        set((s) => ({
          projects: s.projects.map((p) =>
            p.id === projectId
              ? { ...p, files: [...p.files, file], updatedAt: Date.now() }
              : p,
          ),
        })),
      removeProjectFile: (projectId, fileId) =>
        set((s) => ({
          projects: s.projects.map((p) =>
            p.id === projectId
              ? {
                  ...p,
                  files: p.files.filter((f) => f.id !== fileId),
                  updatedAt: Date.now(),
                }
              : p,
          ),
        })),

      setInputGlowEnabled: (inputGlowEnabled) => set({ inputGlowEnabled }),
      setInputGlowColor: (inputGlowColor) => set({ inputGlowColor }),
      setAutoUpdateEnabled: (autoUpdateEnabled) => set({ autoUpdateEnabled }),
      setUpdateAvailable: (updateAvailable) => set({ updateAvailable }),

      // Skills Actions
      setSkills: (skills) => set({ skills }),
      addSkill: (skill) => {
        const id = crypto.randomUUID();
        set((s) => ({
          skills: [...s.skills, { ...skill, id, createdAt: Date.now() }],
        }));
        return id;
      },
      updateSkill: (id, updates) =>
        set((s) => ({
          skills: s.skills.map((skill) =>
            skill.id === id ? { ...skill, ...updates } : skill,
          ),
        })),
      removeSkill: (id) =>
        set((s) => ({
          skills: s.skills.filter((skill) => skill.id !== id),
        })),
    }),
    {
      name: "byte_store",
      version: 3,
      partialize: (state) => {
        // Strip large binary data before persisting to localStorage
        const stripped = { ...state };
        stripped.chats = stripped.chats.map((chat) => ({
          ...chat,
          messages: chat.messages.map((msg) => ({
            ...msg,
            attachments: msg.attachments?.map((att) => {
              if (att.type === "image") {
                const { pdfData, ...rest } = att as any;
                return rest;
              }
              return att;
            }),
          })),
        }));
        return stripped;
      },
      migrate: (persistedState: any, _version: number) => {
        if (persistedState) {
          const migratedQuickPrompts = migrateQuickPrompts(persistedState);
          if (migratedQuickPrompts !== persistedState.quickPrompts) {
            persistedState.quickPrompts = migratedQuickPrompts;
          }
          // Migrate projects to add customInstructions and files
          if (persistedState.projects) {
            persistedState.projects = persistedState.projects.map((p: any) => ({
              ...p,
              customInstructions: p.customInstructions || "",
              files: p.files || [],
            }));
          }
        }
        // v3: migrate plain model IDs → compound "providerId::modelId" keys
        const providers: any[] = persistedState.providers || [];
        const oldEnabled: string[] = persistedState.enabledModelIds || [];
        if (oldEnabled.length > 0 && providers.length > 0) {
          persistedState.enabledModelIds = oldEnabled.map((mid: string) => {
            if (mid.includes("::")) return mid;
            for (const p of providers) {
              if (
                Array.isArray(p.models) &&
                p.models.some((m: any) => m.id === mid)
              ) {
                return `${p.id}::${mid}`;
              }
            }
            return mid;
          });
        }
        const oldSelected: string | null =
          persistedState.selectedModelId || null;
        if (
          oldSelected &&
          !oldSelected.includes("::") &&
          providers.length > 0
        ) {
          for (const p of providers) {
            if (
              Array.isArray(p.models) &&
              p.models.some((m: any) => m.id === oldSelected)
            ) {
              persistedState.selectedModelId = `${p.id}::${oldSelected}`;
              break;
            }
          }
        }
        return persistedState as any;
      },
    },
  ),
);
