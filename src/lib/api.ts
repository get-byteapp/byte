import type {
  Provider,
  Model,
  Message,
  StreamHandle,
  ChatConfig,
  ImageAttachment,
} from "../types";
import { assemblePrompt, getDefaultChatConfig } from "./prompts";

export function formatModelName(modelId: string): {
  displayName: string;
  organizationName: string;
} {
  let displayName = modelId;
  let organizationName = "";

  // Handle Fireworks format: "accounts/fireworks/models/model-name"
  if (modelId.startsWith("accounts/fireworks/models/")) {
    organizationName = "Fireworks";
    displayName = modelId.replace("accounts/fireworks/models/", "");
    displayName = displayName
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  } else if (modelId.includes("/")) {
    // Format: "organization/model-name" -> displayName and organizationName separated
    const parts = modelId.split("/");
    const lastPart = parts[parts.length - 1];
    organizationName = parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
    displayName = lastPart
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  } else if (modelId.includes(":")) {
    // Format: "provider:model-name" -> "Model Name"
    displayName = modelId.split(":")[1];
    displayName = displayName
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  } else {
    // Just capitalize and format
    displayName = displayName
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  }

  return { displayName, organizationName };
}

export function getDisplayName(modelId: string): string {
  const { displayName, organizationName } = formatModelName(modelId);
  // Format as "Provider: Model Name"
  return organizationName ? `${organizationName}: ${displayName}` : displayName;
}

/** Returns a unique key combining provider and model so same-named models from different providers are distinct. */
export function makeModelKey(providerId: string, modelId: string): string {
  return `${providerId}::${modelId}`;
}

/** Resolves a compound "providerId::modelId" key (or a legacy plain modelId) back to provider+model objects. */
export function resolveModel(
  providers: Provider[],
  key: string | null,
): { provider: Provider | null; model: Model | null } {
  if (!key) return { provider: null, model: null };
  const sepIdx = key.indexOf("::");
  if (sepIdx > 0) {
    const providerId = key.slice(0, sepIdx);
    const modelId = key.slice(sepIdx + 2);
    const provider = providers.find((p) => p.id === providerId) || null;
    const model = provider?.models.find((m) => m.id === modelId) || null;
    return { provider, model };
  }
  // Backward compat: legacy plain model ID
  const provider =
    providers.find((p) => p.models.some((m) => m.id === key)) || null;
  const model = provider?.models.find((m) => m.id === key) || null;
  return { provider, model };
}

export function modelHasNativeWebSearch(
  providerId: string,
  modelId: string,
): boolean {
  if (providerId === "perplexity") return true;
  if (providerId === "google") return true;
  if (providerId === "openrouter") return true;
  if (providerId === "anthropic") {
    const id = modelId.toLowerCase();
    return (
      /claude-(opus|sonnet|haiku)?-?4/.test(id) || id.includes("claude-3-5")
    );
  }
  if (providerId === "openai") {
    const id = modelId.toLowerCase();
    return id.includes("search-preview") || id.includes("search-api");
  }
  if (providerId === "groq") {
    return modelId === "groq/compound" || modelId === "groq/compound-mini";
  }
  return false;
}

export function modelSupportsVision(
  providerId: string,
  modelId: string,
): boolean {
  const id = modelId.toLowerCase();
  if (providerId === "openai") {
    return (
      id.includes("gpt-4o") ||
      id.includes("gpt-4-turbo") ||
      id.includes("gpt-4-vision") ||
      id.includes("o1") ||
      id.includes("o3") ||
      id.includes("o4") ||
      id.includes("chatgpt-4o")
    );
  }
  if (providerId === "anthropic") {
    return id.includes("claude-3") || id.includes("claude-4");
  }
  if (providerId === "google") {
    return id.includes("gemini") || id.includes("gemma");
  }
  if (providerId === "groq") {
    return (
      id.includes("vision") || id.includes("scout") || id.includes("maverick")
    );
  }
  if (providerId === "openrouter") {
    return (
      id.includes("vision") ||
      id.includes("gpt-4o") ||
      id.includes("claude-3") ||
      id.includes("gemini") ||
      id.includes("llava") ||
      id.includes("pixtral") ||
      id.includes("qwen-vl") ||
      id.includes("minicpm") ||
      id.includes("phi-3.5")
    );
  }
  if (providerId === "mistral") return id.includes("pixtral");
  if (providerId === "together")
    return id.includes("vision") || id.includes("llava");
  return false;
}

export function formatContextWindow(contextWindow: number): string {
  if (contextWindow >= 1000000)
    return `${Math.floor(contextWindow / 1000000)}M`;
  if (contextWindow >= 1000) return `${Math.floor(contextWindow / 1000)}K`;
  return contextWindow.toString();
}

export async function fetchModels(provider: Provider): Promise<Model[]> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (provider.id === "anthropic") {
    // Anthropic doesn't have a public list models endpoint; return known models
    const knownModels = [
      { id: "claude-opus-4-20250514", name: "Claude Opus 4", contextWindow: 200000 },
      { id: "claude-sonnet-4-20250514", name: "Claude Sonnet 4", contextWindow: 200000 },
      { id: "claude-haiku-4-20250514", name: "Claude Haiku 4", contextWindow: 200000 },
      { id: "claude-3-5-sonnet-20241022", name: "Claude Sonnet 3.5", contextWindow: 200000 },
      { id: "claude-3-5-haiku-20241022", name: "Claude Haiku 3.5", contextWindow: 200000 },
      { id: "claude-3-opus-20240229", name: "Claude Opus 3", contextWindow: 200000 },
      { id: "claude-3-sonnet-20240229", name: "Claude Sonnet 3", contextWindow: 200000 },
      { id: "claude-3-haiku-20240307", name: "Claude Haiku 3", contextWindow: 200000 },
    ];
    return knownModels.map((m) => ({
      id: m.id,
      name: m.name,
      providerId: provider.id,
      contextWindow: m.contextWindow,
      enabled: false,
      capabilities: {
        webSearch: modelHasNativeWebSearch(provider.id, m.id),
        supportsVision: modelSupportsVision(provider.id, m.id),
      },
    }));
  } else if (provider.id === "google") {
    // Always use the correct endpoint regardless of stored baseUrl
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${provider.apiKey}`;
    const response = await fetch(url, { headers });
    if (!response.ok)
      throw new Error(`Failed to fetch models: ${response.statusText}`);
    const data = await response.json();
    const modelsData = (data.models || []).filter(
      (m: any) =>
        Array.isArray(m.supportedGenerationMethods) &&
        m.supportedGenerationMethods.includes("generateContent"),
    );
    return modelsData.map((m: any) => {
      const id = m.name?.replace("models/", "") || m.name;
      return {
        id,
        name: m.displayName || getDisplayName(id),
        providerId: provider.id,
        contextWindow: m.inputTokenLimit || 128000,
        enabled: false,
        capabilities: {
          webSearch: modelHasNativeWebSearch(provider.id, id),
          supportsVision: modelSupportsVision(provider.id, id),
        },
      };
    });
  } else if (provider.id === "openai") {
    headers["Authorization"] = `Bearer ${provider.apiKey}`;
    const response = await fetch(`${provider.baseUrl}/models`, { headers });
    if (!response.ok)
      throw new Error(`Failed to fetch models: ${response.statusText}`);
    const data = await response.json();
    const modelsData = data.data || [];
    return modelsData
      .filter((m: any) => m.id)
      .map((m: any) => ({
        id: m.id,
        name: getDisplayName(m.id),
        providerId: provider.id,
        contextWindow: 128000, // OpenAI doesn't return context window in list
        enabled: false,
        capabilities: {
          webSearch: modelHasNativeWebSearch(provider.id, m.id),
          supportsVision: modelSupportsVision(provider.id, m.id),
        },
      }));
  } else if (provider.id === "groq") {
    headers["Authorization"] = `Bearer ${provider.apiKey}`;
    const response = await fetch(`${provider.baseUrl}/models`, { headers });
    if (!response.ok)
      throw new Error(`Failed to fetch models: ${response.statusText}`);
    const data = await response.json();
    const modelsData = data.data || [];
    return modelsData.map((m: any) => ({
      id: m.id,
      name: getDisplayName(m.id),
      providerId: provider.id,
      contextWindow: m.context_window || 128000,
      enabled: false,
      capabilities: {
        webSearch: modelHasNativeWebSearch(provider.id, m.id),
        supportsVision: modelSupportsVision(provider.id, m.id),
      },
    }));
  } else if (provider.id === "cerebras") {
    // Cerebras's public endpoint returns full model metadata including context_length.
    // No API key required — the key is still used for all chat requests.
    const response = await fetch(
      "https://api.cerebras.ai/public/v1/models?format=openrouter",
    );
    if (!response.ok)
      throw new Error(
        `Failed to fetch Cerebras models: ${response.statusText}`,
      );
    const data = await response.json();
    const modelsData: any[] = data.data || [];
    return modelsData.map((m: any) => ({
      id: m.id,
      name: m.name || getDisplayName(m.id),
      providerId: provider.id,
      contextWindow: m.context_length || 128000,
      enabled: false,
      capabilities: {
        webSearch: false,
        supportsVision: modelSupportsVision(provider.id, m.id),
      },
    }));
  } else if (provider.id === "huggingface") {
    headers["Authorization"] = `Bearer ${provider.apiKey}`;
    const response = await fetch(`${provider.baseUrl}/models?full=true`, {
      headers,
    });
    if (!response.ok)
      throw new Error(`Failed to fetch models: ${response.statusText}`);
    const data = await response.json();
    const modelsData = Array.isArray(data) ? data : data.models || [];
    return modelsData
      .filter(
        (m: any) => (m.id && !m.id.includes("/")) || m.id.startsWith("meta-"),
      )
      .slice(0, 100)
      .map((m: any) => ({
        id: m.id,
        name: getDisplayName(m.id),
        providerId: provider.id,
        contextWindow: m.context_window || m.config?.context_length || 4096,
        enabled: false,
        capabilities: {
          webSearch: false,
          supportsVision: modelSupportsVision(provider.id, m.id),
        },
      }));
  } else if (provider.id === "cohere") {
    headers["Authorization"] = `Bearer ${provider.apiKey}`;
    const response = await fetch(`${provider.baseUrl}/v1/models`, { headers });
    if (!response.ok)
      throw new Error(`Failed to fetch models: ${response.statusText}`);
    const data = await response.json();
    const modelsData = data.models || [];
    return modelsData
      .filter((m: any) => m.type === "chat" || m.id.startsWith("command"))
      .map((m: any) => ({
        id: m.id,
        name: getDisplayName(m.id),
        providerId: provider.id,
        contextWindow: m.context_window_size || m.context_window || 4096,
        enabled: false,
        capabilities: {
          webSearch: false,
          supportsVision: modelSupportsVision(provider.id, m.id),
        },
      }));
  } else if (provider.id === "perplexity") {
    headers["Authorization"] = `Bearer ${provider.apiKey}`;
    const response = await fetch(`${provider.baseUrl}/models`, { headers });
    if (!response.ok)
      throw new Error(`Failed to fetch models: ${response.statusText}`);
    const data = await response.json();
    const modelsData = data.data || [];
    return modelsData.map((m: any) => ({
      id: m.id,
      name: getDisplayName(m.id),
      providerId: provider.id,
      contextWindow: m.context_window || 128000,
      enabled: false,
      capabilities: {
        webSearch: true,
        supportsVision: modelSupportsVision(provider.id, m.id),
      },
    }));
  } else if (provider.id === "together") {
    headers["Authorization"] = `Bearer ${provider.apiKey}`;
    const response = await fetch(`${provider.baseUrl}/models`, { headers });
    if (!response.ok)
      throw new Error(`Failed to fetch models: ${response.statusText}`);
    const data = await response.json();
    const modelsData = data.data || [];
    return modelsData.map((m: any) => ({
      id: m.id,
      name: getDisplayName(m.id),
      providerId: provider.id,
      contextWindow: m.context_window || m.context_length || 128000,
      enabled: false,
      capabilities: {
        webSearch: false,
        supportsVision: modelSupportsVision(provider.id, m.id),
      },
    }));
  } else if (provider.id === "replicate") {
    headers["Authorization"] = `Bearer ${provider.apiKey}`;
    const response = await fetch("https://api.replicate.com/v1/models", {
      headers,
    });
    if (!response.ok)
      throw new Error(`Failed to fetch models: ${response.statusText}`);
    const data = await response.json();
    const modelsData = data.results || [];
    return modelsData.map((m: any) => ({
      id: m.version?.id || m.name,
      name: getDisplayName(m.name),
      providerId: provider.id,
      contextWindow: m.version?.controller?.max_length || 4096,
      enabled: false,
      capabilities: {
        webSearch: false,
        supportsVision: modelSupportsVision(provider.id, m.id),
      },
    }));
  } else if (provider.id === "fireworks") {
    headers["Authorization"] = `Bearer ${provider.apiKey}`;
    const response = await fetch(`${provider.baseUrl}/models`, { headers });
    if (!response.ok)
      throw new Error(`Failed to fetch models: ${response.statusText}`);
    const data = await response.json();
    const modelsData = data.data || [];
    return modelsData.map((m: any) => ({
      id: m.id,
      name: getDisplayName(m.id),
      providerId: provider.id,
      contextWindow: m.context_window || 128000,
      enabled: false,
      capabilities: {
        webSearch: false,
        supportsVision: modelSupportsVision(provider.id, m.id),
      },
    }));
  } else if (provider.id === "openrouter") {
    headers["Authorization"] = `Bearer ${provider.apiKey}`;
    const response = await fetch(`${provider.baseUrl}/models`, { headers });
    if (!response.ok)
      throw new Error(`Failed to fetch models: ${response.statusText}`);
    const data = await response.json();
    const modelsData = data.data || [];
    return modelsData.map((m: any) => ({
      id: m.id,
      name: m.name || getDisplayName(m.id),
      providerId: provider.id,
      contextWindow: m.context_length || m.context_window || 128000,
      enabled: false,
      capabilities: {
        webSearch: true,
        supportsVision: modelSupportsVision(provider.id, m.id),
      },
    }));
  } else if (provider.id === "ollama" || provider.id === "lmstudio") {
    let modelsData: any[] = [];

    const response = await fetch(`${provider.baseUrl}/models`, { headers });
    if (response.ok) {
      const data = await response.json();
      modelsData = data.data || data.models || [];
    } else if (provider.id === "ollama") {
      const listResponse = await fetch("http://localhost:11434/api/tags", {
        headers,
      });
      if (!listResponse.ok)
        throw new Error(`Failed to fetch models: ${listResponse.statusText}`);
      const listData = await listResponse.json();
      modelsData = listData.models || [];
    } else {
      throw new Error(`Failed to fetch models: ${response.statusText}`);
    }

    return modelsData.map((m: any) => ({
      id: m.id || m.name,
      name: m.name || getDisplayName(m.id || ""),
      providerId: provider.id,
      contextWindow: m.context_window || m.context_length || 4096,
      enabled: false,
      capabilities: {
        webSearch: false,
        supportsVision: modelSupportsVision(provider.id, m.id),
      },
    }));
  } else if (
    provider.id === "mistral" ||
    provider.id === "aleph_alpha" ||
    provider.id === "modal"
  ) {
    headers["Authorization"] = `Bearer ${provider.apiKey}`;
    const response = await fetch(`${provider.baseUrl}/v1/models`, { headers });
    if (!response.ok)
      throw new Error(`Failed to fetch models: ${response.statusText}`);
    const data = await response.json();
    const modelsData = data.data || [];
    return modelsData.map((m: any) => ({
      id: m.id,
      name: getDisplayName(m.id),
      providerId: provider.id,
      contextWindow: m.context_window || m.context_length || 128000,
      enabled: false,
      capabilities: {
        webSearch: false,
        supportsVision: modelSupportsVision(provider.id, m.id),
      },
    }));
  } else {
    headers["Authorization"] = `Bearer ${provider.apiKey}`;
    const response = await fetch(`${provider.baseUrl}/v1/models`, { headers });
    if (!response.ok)
      throw new Error(`Failed to fetch models: ${response.statusText}`);
    const data = await response.json();
    const modelsData = data.data || [];
    return modelsData.map((m: any) => {
      let contextWindow = 128000;
      if (m.context_length) contextWindow = m.context_length;
      else if (m.top_provider?.context_length)
        contextWindow = m.top_provider.context_length;
      else if (m.context_window) contextWindow = m.context_window;
      else if (m.meta?.context_window) contextWindow = m.meta.context_window;
      else if (m.architecture?.max_tokens)
        contextWindow = m.architecture.max_tokens;
      else if (m.max_tokens) contextWindow = m.max_tokens;
      return {
        id: m.id,
        name: getDisplayName(m.id),
        providerId: provider.id,
        contextWindow,
        enabled: false,
        capabilities: {
          webSearch: modelHasNativeWebSearch(provider.id, m.id),
          supportsVision: modelSupportsVision(provider.id, m.id),
        },
      };
    });
  }

  return [];
}

export async function extractTextFromImage(
  provider: Provider,
  model: Model,
  dataUri: string,
  mimeType: string,
): Promise<string> {
  const base64Data = dataUri.includes(",") ? dataUri.split(",")[1] : dataUri;
  const prompt =
    "Extract all visible text from this image. Return only the text you can see, preserving formatting and layout as much as possible. If there's no text, return '[No text found]'.";

  if (provider.id === "anthropic") {
    const resp = await fetch(`${provider.baseUrl}/v1/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": provider.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: model.id,
        max_tokens: 2048,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: mimeType,
                  data: base64Data,
                },
              },
              { type: "text", text: prompt },
            ],
          },
        ],
      }),
    });
    const data = await resp.json();
    return data.content?.[0]?.text || "[No text found]";
  }

  if (provider.id === "google") {
    const modelName = model.id.replace("models/", "");
    const resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${provider.apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [
                { inlineData: { mimeType, data: base64Data } },
                { text: prompt },
              ],
            },
          ],
        }),
      },
    );
    const data = await resp.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || "[No text found]";
  }

  // OpenAI-compatible default
  const resp = await fetch(`${provider.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${provider.apiKey}`,
    },
    body: JSON.stringify({
      model: model.id,
      max_tokens: 2048,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "image_url", image_url: { url: dataUri } },
          ],
        },
      ],
    }),
  });
  const data = await resp.json();
  return data.choices?.[0]?.message?.content || "[No text found]";
}

export async function describeImage(
  provider: Provider,
  model: Model,
  dataUri: string,
  mimeType: string,
): Promise<string> {
  const base64Data = dataUri.includes(",") ? dataUri.split(",")[1] : dataUri;
  const prompt =
    "Describe this image concisely and accurately in 1-3 sentences, focusing on what would be most useful context for answering questions about it.";

  if (provider.id === "anthropic") {
    const resp = await fetch(`${provider.baseUrl}/v1/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": provider.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: model.id,
        max_tokens: 512,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: mimeType,
                  data: base64Data,
                },
              },
              { type: "text", text: prompt },
            ],
          },
        ],
      }),
    });
    const data = await resp.json();
    return data.content?.[0]?.text || "Could not describe image.";
  }

  if (provider.id === "google") {
    const modelName = model.id.replace("models/", "");
    const resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${provider.apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [
                { inlineData: { mimeType, data: base64Data } },
                { text: prompt },
              ],
            },
          ],
        }),
      },
    );
    const data = await resp.json();
    return (
      data.candidates?.[0]?.content?.parts?.[0]?.text ||
      "Could not describe image."
    );
  }

  // OpenAI-compatible default
  const resp = await fetch(`${provider.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${provider.apiKey}`,
    },
    body: JSON.stringify({
      model: model.id,
      max_tokens: 512,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "image_url", image_url: { url: dataUri } },
          ],
        },
      ],
    }),
  });
  const data = await resp.json();
  return data.choices?.[0]?.message?.content || "Could not describe image.";
}

async function streamGroq(
  provider: Provider,
  model: Model,
  messages: Message[],
  systemPrompt: string,
  onChunk: (text: string) => void,
  onDone: () => void,
  _onError: (error: Error) => void,
  controller: AbortController,
  _useNativeSearch: boolean = false,
  _attachments?: ImageAttachment[],
) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${provider.apiKey}`,
  };

  const apiMessages: Array<{ role: string; content: string | Array<{ type: string; text?: string; image_url?: { url: string } }> }> = [];

  if (systemPrompt) {
    apiMessages.push({ role: "system", content: systemPrompt });
  }

  apiMessages.push(
    ...messages.map((m) => {
      // Separate vision and non-vision attachments (only ImageAttachments have mode)
      const imageAttachments = m.attachments?.filter((a) => a.type === "image") as ImageAttachment[] | undefined || [];
      const visionAttachments = imageAttachments.filter((a) => a.mode === "vision");
      const ocrAttachments = imageAttachments.filter((a) => a.mode === "ocr");
      const describeAttachments = imageAttachments.filter((a) => a.mode === "describe");
      
      // Debug: log attachments
      if (m.attachments && m.attachments.length > 0) {
        console.log("[Groq] Message attachments:", {
          total: m.attachments.length,
          vision: visionAttachments.length,
          ocr: ocrAttachments.length,
          describe: describeAttachments.length,
          attachments: m.attachments.map((a) => ({ type: a.type, mode: (a as any).mode, hasDescription: !!(a as any).description })),
        });
      }
      
      // Build message content
      let messageContent = m.content;
      
      // Add OCR extracted text
      for (const att of ocrAttachments) {
        if (att.description) {
          messageContent += `\n\n[OCR from ${att.fileName}]\n${att.description}`;
        }
      }
      
      // Add describe extracted text
      for (const att of describeAttachments) {
        if (att.description) {
          messageContent += `\n\n[Image description of ${att.fileName}]\n${att.description}`;
        }
      }
      
      if (m.role === "user" && visionAttachments.length > 0 && model.capabilities?.supportsVision) {
        // Build multimodal content for vision attachments
        const content: Array<{ type: string; text?: string; image_url?: { url: string } }> = [];
        
        // Add text content
        if (messageContent.trim()) {
          content.push({ type: "text", text: messageContent });
        }
        
        // Add images
        for (const att of visionAttachments) {
          if (att.type === "image") {
            content.push({
              type: "image_url",
              image_url: { url: att.dataUri },
            });
          }
        }
        
        return { role: m.role, content };
      }
      
      return { role: m.role, content: messageContent };
    }),
  );

  const response = await fetch(
    "https://api.groq.com/openai/v1/chat/completions",
    {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: model.id,
        messages: apiMessages,
        stream: true,
      }),
      signal: controller.signal,
    },
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`API error: ${response.status} ${error}`);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error("No response body");

  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (!line.trim() || !line.startsWith("data: ")) continue;
        const data = line.slice(6).trim();
        if (data === "[DONE]") {
          onDone();
          return;
        }
        // Skip error objects that may appear in stream
        if (data.startsWith("{") && data.includes("error")) {
          console.warn("[Groq] Ignoring error in stream:", data);
          continue;
        }
        try {
          const json = JSON.parse(data);
          const content = json.choices?.[0]?.delta?.content;
          if (content) onChunk(content);
        } catch {
          /* ignore parse errors */
        }
      }
    }
  } finally {
    // Read any remaining buffered data
    if (buffer.trim()) {
      if (buffer.includes("error")) {
        console.warn("[Groq] Ignoring error in buffered data:", buffer);
      }
    }
    reader.releaseLock();
    onDone();
  }
}

export function streamChat(
  provider: Provider,
  model: Model,
  messages: Message[],
  onChunk: (text: string) => void,
  onDone: () => void,
  onError: (error: Error) => void,
  chatConfig?: ChatConfig,
  memories?: { id: string; name: string; content: string }[],
  simplifiedSystemPrompt?: string | null,
  extraContext?: string,
  attachments?: ImageAttachment[],
): StreamHandle {
  let isAborted = false;

  const abort = () => {
    isAborted = true;
    controller.abort();
  };

  const controller = new AbortController();

  const config = chatConfig || getDefaultChatConfig();
  const useNativeSearch =
    config.enabledTools.includes("WEB_SEARCH") && model.capabilities?.webSearch;
  const basePrompt =
    simplifiedSystemPrompt ||
    assemblePrompt(config, memories, model).systemPrompt;
  const systemPrompt = extraContext
    ? `${extraContext}\n\n${basePrompt}`
    : basePrompt;

  (async () => {
    try {
      if (provider.id === "anthropic") {
        await streamAnthropic(
          provider,
          model,
          messages,
          systemPrompt,
          onChunk,
          onDone,
          onError,
          controller,
          useNativeSearch,
          attachments,
        );
      } else if (provider.id === "google") {
        await streamGoogle(
          provider,
          model,
          messages,
          systemPrompt,
          onChunk,
          onDone,
          onError,
          controller,
          useNativeSearch,
          attachments,
        );
      } else if (provider.id === "groq") {
        await streamGroq(
          provider,
          model,
          messages,
          systemPrompt,
          onChunk,
          onDone,
          onError,
          controller,
          useNativeSearch,
          attachments,
        );
      } else if (provider.id === "fireworks") {
        await streamOpenAICompatible(
          provider,
          model,
          messages,
          systemPrompt,
          onChunk,
          onDone,
          onError,
          controller,
          useNativeSearch,
          attachments,
        );
      } else {
        await streamOpenAICompatible(
          provider,
          model,
          messages,
          systemPrompt,
          onChunk,
          onDone,
          onError,
          controller,
          useNativeSearch,
          attachments,
        );
      }
    } catch (err) {
      if (!isAborted) {
        onError(err instanceof Error ? err : new Error(String(err)));
      }
    }
  })();

  return {
    abort,
    get isAborted() {
      return isAborted;
    },
  };
}

async function streamOpenAICompatible(
  provider: Provider,
  model: Model,
  messages: Message[],
  systemPrompt: string,
  onChunk: (text: string) => void,
  onDone: () => void,
  _onError: (error: Error) => void,
  controller: AbortController,
  useNativeSearch: boolean = false,
  _attachments?: ImageAttachment[],
) {
  const apiMessages: Array<{ role: string; content: any }> = [];
  if (systemPrompt) {
    apiMessages.push({ role: "system", content: systemPrompt });
  }
  const lastUserIdx = messages.reduce(
    (acc, m, i) => (m.role === "user" ? i : acc),
    -1,
  );
  apiMessages.push(
    ...messages.map((m, i) => {
      // Separate vision and non-vision attachments (only ImageAttachments have mode)
      const imageAttachments = m.attachments?.filter((a) => a.type === "image") as ImageAttachment[] | undefined || [];
      const visionAttachments = imageAttachments.filter((a) => a.mode === "vision");
      const ocrAttachments = imageAttachments.filter((a) => a.mode === "ocr");
      const describeAttachments = imageAttachments.filter((a) => a.mode === "describe");
      
      // Build message content
      let messageContent = m.content;
      
      // Add OCR extracted text
      for (const att of ocrAttachments) {
        if (att.description) {
          messageContent += `\n\n[OCR from ${att.fileName}]\n${att.description}`;
        }
      }
      
      // Add describe extracted text
      for (const att of describeAttachments) {
        if (att.description) {
          messageContent += `\n\n[Image description of ${att.fileName}]\n${att.description}`;
        }
      }
      
      if (i === lastUserIdx && visionAttachments && visionAttachments.length > 0) {
        const parts: any[] = [];
        if (messageContent) parts.push({ type: "text", text: messageContent });
        for (const att of visionAttachments) {
          parts.push({ type: "image_url", image_url: { url: att.dataUri } });
        }
        return { role: m.role, content: parts.length > 1 ? parts : messageContent };
      }
      return { role: m.role, content: messageContent };
    }),
  );

  const body: Record<string, unknown> = {
    model: model.id,
    messages: apiMessages,
    stream: true,
  };

  if (useNativeSearch) {
    if (provider.id === "openai") {
      body.tools = [{ type: "web_search" }];
    } else if (provider.id === "openrouter") {
      body.tools = [{ type: "openrouter:web_search" }];
    }
  }

  const response = await fetch(`${provider.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${provider.apiKey}`,
    },
    body: JSON.stringify(body),
    signal: controller.signal,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`API error: ${response.status} ${error}`);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error("No response body");

  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith("data:")) continue;
        const data = trimmed.slice(5).trim();
        if (data === "[DONE]") {
          onDone();
          return;
        }
        // Skip error objects that may appear in stream
        if (data.startsWith("{") && data.includes("error")) {
          console.warn("[OpenAI-compat] Ignoring error in stream:", data);
          continue;
        }
        try {
          const parsed = JSON.parse(data);
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) onChunk(content);
        } catch {
          // Skip malformed JSON
        }
      }
    }
  } finally {
    // Read any remaining buffered data
    if (buffer.trim()) {
      if (buffer.includes("error")) {
        console.warn("[OpenAI-compat] Ignoring error in buffered data:", buffer);
      }
    }
    reader.releaseLock();
    onDone();
  }
}

async function streamAnthropic(
  provider: Provider,
  model: Model,
  messages: Message[],
  systemPrompt: string,
  onChunk: (text: string) => void,
  onDone: () => void,
  _onError: (error: Error) => void,
  controller: AbortController,
  useNativeSearch: boolean = false,
  attachments?: ImageAttachment[],
) {
  const apiMessages = messages.map((m, i) => {
    const isLastUser =
      m.role === "user" &&
      i ===
        messages.reduce((a, msg, idx) => (msg.role === "user" ? idx : a), -1);
    if (isLastUser && attachments && attachments.length > 0) {
      const parts: any[] = [];
      for (const att of attachments) {
        if (att.mode === "vision") {
          parts.push({
            type: "image",
            source: {
              type: "base64",
              media_type: att.mimeType,
              data: att.dataUri.includes(",")
                ? att.dataUri.split(",")[1]
                : att.dataUri,
            },
          });
        }
      }
      if (m.content) parts.push({ type: "text", text: m.content });
      return { role: "user", content: parts.length > 1 ? parts : m.content };
    }
    return {
      role: m.role === "assistant" ? "assistant" : "user",
      content: m.content,
    };
  });
  const requestBody: Record<string, unknown> = {
    model: model.id,
    messages: apiMessages,
    max_tokens: 4096,
    stream: true,
  };

  if (systemPrompt) {
    requestBody.system = systemPrompt;
  }

  if (useNativeSearch) {
    requestBody.tools = [{ type: "web_search_20250305", name: "web_search" }];
  }

  const response = await fetch(`${provider.baseUrl}/v1/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": provider.apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify(requestBody),
    signal: controller.signal,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`API error: ${response.status} ${error}`);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error("No response body");

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith("data:")) continue;
      const data = trimmed.slice(5).trim();
      if (data === "[DONE]") {
        onDone();
        return;
      }
      try {
        const parsed = JSON.parse(data);
        if (parsed.type === "content_block_delta") {
          const text = parsed.delta?.text;
          if (text) onChunk(text);
        }
        if (parsed.type === "message_stop") {
          onDone();
          return;
        }
      } catch {
        // Skip malformed JSON
      }
    }
  }

  onDone();
}

async function streamGoogle(
  provider: Provider,
  model: Model,
  messages: Message[],
  systemPrompt: string,
  onChunk: (text: string) => void,
  onDone: () => void,
  _onError: (error: Error) => void,
  controller: AbortController,
  useNativeSearch: boolean = false,
  attachments?: ImageAttachment[],
) {
  const modelName = model.id.replace("models/", "");
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:streamGenerateContent?key=${provider.apiKey}&alt=sse`;

  const lastUserIdx = messages.reduce(
    (a, m, i) => (m.role === "user" ? i : a),
    -1,
  );
  const contents = messages.map((m, i) => {
    const role = m.role === "assistant" ? "model" : "user";
    if (i === lastUserIdx && attachments && attachments.length > 0) {
      const parts: any[] = [];
      if (m.content) parts.push({ text: m.content });
      for (const att of attachments) {
        if (att.mode === "vision") {
          const b64 = att.dataUri.includes(",")
            ? att.dataUri.split(",")[1]
            : att.dataUri;
          parts.push({ inlineData: { mimeType: att.mimeType, data: b64 } });
        }
      }
      return { role, parts };
    }
    return { role, parts: [{ text: m.content }] };
  });
  const requestBody: Record<string, unknown> = {
    contents,
  };

  if (systemPrompt) {
    requestBody.systemInstruction = { parts: [{ text: systemPrompt }] };
  }

  if (useNativeSearch) {
    requestBody.groundingConfig = { sources: ["GOOGLE_SEARCH"] };
  }

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(requestBody),
    signal: controller.signal,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`API error: ${response.status} ${error}`);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error("No response body");

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith("data:")) continue;
      const data = trimmed.slice(5).trim();
      try {
        const parsed = JSON.parse(data);
        const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) onChunk(text);
      } catch {
        // Skip malformed JSON
      }
    }
  }

  onDone();
}

// Non-streaming version - waits for full response
export async function sendChatMessage(
  provider: Provider,
  model: Model,
  messages: Message[],
  signal?: AbortSignal,
  chatConfig?: ChatConfig,
  memories?: { id: string; name: string; content: string }[],
  simplifiedSystemPrompt?: string | null,
  extraContext?: string,
  attachments?: ImageAttachment[],
): Promise<string> {
  const config = chatConfig || getDefaultChatConfig();
  const useNativeSearch =
    config.enabledTools.includes("WEB_SEARCH") && model.capabilities?.webSearch;
  const basePrompt =
    simplifiedSystemPrompt ||
    assemblePrompt(config, memories, model).systemPrompt;
  const systemPrompt = extraContext
    ? `${extraContext}\n\n${basePrompt}`
    : basePrompt;

  if (provider.id === "anthropic") {
    return sendAnthropicMessage(
      provider,
      model,
      messages,
      systemPrompt,
      signal,
      useNativeSearch,
      attachments,
    );
  } else if (provider.id === "google") {
    return sendGoogleMessage(
      provider,
      model,
      messages,
      systemPrompt,
      signal,
      useNativeSearch,
      attachments,
    );
  } else {
    return sendOpenAICompatibleMessage(
      provider,
      model,
      messages,
      systemPrompt,
      signal,
      useNativeSearch,
      attachments,
    );
  }
}

export async function generateChatTitle(
  provider: Provider,
  model: Model,
  messages: { role: string; content: string }[],
): Promise<string> {
  const systemPrompt =
    "Generate a very short, concise title (3-6 words, under 45 characters) that summarizes this conversation. Return ONLY the title, nothing else.";
  try {
    if (provider.id === "anthropic") {
      const anthropicMessages = messages.map((m) => ({
        role: m.role === "system" ? "assistant" : m.role,
        content: m.content,
      }));
      const response = await fetch(`${provider.baseUrl}/v1/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": provider.apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: model.id,
          system: systemPrompt,
          messages: anthropicMessages,
          max_tokens: 20,
          temperature: 0.3,
        }),
      });
      const data = await response.json();
      return (
        data.content?.[0]?.text?.trim() ||
        messages[0]?.content?.slice(0, 40) ||
        "New chat"
      );
    } else if (provider.id === "google") {
      const response = await fetch(
        `${provider.baseUrl}/v1/models/${model.id}:generateContent`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": provider.apiKey,
          },
          body: JSON.stringify({
            contents: [
              {
                role: "user",
                parts: [
                  {
                    text: `${systemPrompt}\n\n${messages.map((m) => `${m.role}: ${m.content}`).join("\n")}`,
                  },
                ],
              },
            ],
            generationConfig: { maxOutputTokens: 20, temperature: 0.3 },
          }),
        },
      );
      const data = await response.json();
      return (
        data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ||
        messages[0]?.content?.slice(0, 40) ||
        "New chat"
      );
    } else {
      const response = await fetch(`${provider.baseUrl}/v1/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${provider.apiKey}`,
        },
        body: JSON.stringify({
          model: model.id,
          messages: [{ role: "system", content: systemPrompt }, ...messages],
          max_tokens: 20,
          temperature: 0.3,
        }),
      });
      const data = await response.json();
      return (
        data.choices?.[0]?.message?.content?.trim() ||
        messages[0]?.content?.slice(0, 40) ||
        "New chat"
      );
    }
  } catch {
    return messages[0]?.content?.slice(0, 40) || "New chat";
  }
}

async function sendOpenAICompatibleMessage(
  provider: Provider,
  model: Model,
  messages: Message[],
  systemPrompt: string,
  signal?: AbortSignal,
  useNativeSearch: boolean = false,
  attachments?: ImageAttachment[],
): Promise<string> {
  const apiMessages: Array<{ role: string; content: any }> = [];
  if (systemPrompt) {
    apiMessages.push({ role: "system", content: systemPrompt });
  }
  const lastUserIdx = messages.reduce(
    (acc, m, i) => (m.role === "user" ? i : acc),
    -1,
  );
  apiMessages.push(
    ...messages.map((m, i) => {
      if (i === lastUserIdx && attachments && attachments.length > 0) {
        const parts: any[] = [];
        if (m.content) parts.push({ type: "text", text: m.content });
        for (const att of attachments) {
          if (att.mode === "vision") {
            parts.push({ type: "image_url", image_url: { url: att.dataUri } });
          }
        }
        return { role: m.role, content: parts.length > 1 ? parts : m.content };
      }
      return { role: m.role, content: m.content };
    }),
  );

  const body: Record<string, unknown> = {
    model: model.id,
    messages: apiMessages,
    stream: false,
  };

  if (useNativeSearch) {
    if (provider.id === "openai") {
      body.tools = [{ type: "web_search" }];
    } else if (provider.id === "openrouter") {
      body.tools = [{ type: "openrouter:web_search" }];
    }
  }

  const response = await fetch(`${provider.baseUrl}/v1/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${provider.apiKey}`,
    },
    body: JSON.stringify(body),
    signal,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`API error: ${response.status} ${error}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "";
}

async function sendAnthropicMessage(
  provider: Provider,
  model: Model,
  messages: Message[],
  systemPrompt: string,
  signal?: AbortSignal,
  useNativeSearch: boolean = false,
  attachments?: ImageAttachment[],
): Promise<string> {
  const apiMessages = messages.map((m, i) => {
    const isLastUser =
      m.role === "user" &&
      i ===
        messages.reduce((a, msg, idx) => (msg.role === "user" ? idx : a), -1);
    if (isLastUser && attachments && attachments.length > 0) {
      const parts: any[] = [];
      for (const att of attachments) {
        if (att.mode === "vision") {
          parts.push({
            type: "image",
            source: {
              type: "base64",
              media_type: att.mimeType,
              data: att.dataUri.includes(",")
                ? att.dataUri.split(",")[1]
                : att.dataUri,
            },
          });
        }
      }
      if (m.content) parts.push({ type: "text", text: m.content });
      return { role: "user", content: parts.length > 1 ? parts : m.content };
    }
    return {
      role: m.role === "assistant" ? "assistant" : "user",
      content: m.content,
    };
  });
  const requestBody: Record<string, unknown> = {
    model: model.id,
    messages: apiMessages,
    max_tokens: 4096,
    stream: false,
  };

  if (systemPrompt) {
    requestBody.system = systemPrompt;
  }

  if (useNativeSearch) {
    requestBody.tools = [{ type: "web_search_20250305", name: "web_search" }];
  }

  const response = await fetch(`${provider.baseUrl}/v1/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": provider.apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify(requestBody),
    signal,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`API error: ${response.status} ${error}`);
  }

  const data = await response.json();
  return data.content?.[0]?.text || "";
}

async function sendGoogleMessage(
  provider: Provider,
  model: Model,
  messages: Message[],
  systemPrompt: string,
  signal?: AbortSignal,
  useNativeSearch: boolean = false,
  attachments?: ImageAttachment[],
): Promise<string> {
  const modelName = model.id.replace("models/", "");
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${provider.apiKey}`;

  const lastUserIdx = messages.reduce(
    (a, m, i) => (m.role === "user" ? i : a),
    -1,
  );
  const contents = messages.map((m, i) => {
    const role = m.role === "assistant" ? "model" : "user";
    if (i === lastUserIdx && attachments && attachments.length > 0) {
      const parts: any[] = [];
      if (m.content) parts.push({ text: m.content });
      for (const att of attachments) {
        if (att.mode === "vision") {
          const b64 = att.dataUri.includes(",")
            ? att.dataUri.split(",")[1]
            : att.dataUri;
          parts.push({ inlineData: { mimeType: att.mimeType, data: b64 } });
        }
      }
      return { role, parts };
    }
    return { role, parts: [{ text: m.content }] };
  });
  const requestBody: Record<string, unknown> = {
    contents,
  };

  if (systemPrompt) {
    requestBody.systemInstruction = { parts: [{ text: systemPrompt }] };
  }

  if (useNativeSearch) {
    requestBody.groundingConfig = { sources: ["GOOGLE_SEARCH"] };
  }

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(requestBody),
    signal,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`API error: ${response.status} ${error}`);
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
}

interface LangSearchResult {
  id: string;
  name: string;
  url: string;
  displayUrl: string;
  snippet: string;
  summary?: string;
  datePublished?: string;
}

interface LangSearchResponse {
  code: number;
  data: {
    _type: string;
    queryContext: { originalQuery: string };
    webPages?: {
      totalEstimatedMatches: number;
      value: LangSearchResult[];
    };
  };
}

export async function searchWithLangSearch(
  query: string,
  apiKey: string,
  options?: { count?: number; freshness?: string },
): Promise<LangSearchResult[]> {
  const response = await fetch("https://api.langsearch.com/v1/web-search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      query,
      freshness: options?.freshness || "oneYear",
      summary: false,
      count: options?.count || 5,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`LangSearch API error: ${response.status} ${error}`);
  }

  const result: LangSearchResponse = await response.json();
  if (result.code !== 200)
    throw new Error("LangSearch API returned non-200 status");
  return result.data?.webPages?.value || [];
}

export async function fetchPageWithJina(url: string): Promise<string> {
  const response = await fetch(`https://r.jina.ai/${encodeURIComponent(url)}`, {
    headers: { Accept: "text/markdown" },
  });
  if (!response.ok) throw new Error(`Jina error: ${response.status}`);
  return await response.text();
}
