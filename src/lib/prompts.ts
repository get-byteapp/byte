/**
 * Prompt Assembly Module
 * 
 * Assembles system prompts based on chat configuration.
 * Order: MAIN → Style → Agent → Memory → Date Context → Tools → Mode
 */

import type { ChatConfig, ToolId, ModeId, ResponseStyleId, Model } from '../types';
import { getDateContextString } from './dateProvider';

// Import all prompt files as raw strings
import MAIN from '../../prompts/MAIN.md?raw';

// Agents
import AGENT_DEFAULT from '../../prompts/agents/DEFAULT.md?raw';

// Tools
import TOOL_WEB_SEARCH from '../../prompts/tools/WEB_SEARCH.md?raw';
import TOOL_URL_FETCH from '../../prompts/tools/URL_FETCH.md?raw';
import TOOL_FILE_READ from '../../prompts/tools/FILE_READ.md?raw';
import TOOL_ASK_QUESTION from '../../prompts/tools/ASK_QUESTION.md?raw';
import TOOL_CONFIRM_ACTION from '../../prompts/tools/CONFIRM_ACTION.md?raw';
import TOOL_RUN_PYTHON from '../../prompts/tools/RUN_PYTHON.md?raw';

// Modes
import MODE_CANVAS from '../../prompts/modes/CANVAS.md?raw';
import MODE_COUNCIL from '../../prompts/modes/COUNCIL.md?raw';

// Styles
import STYLE_NORMAL from '../../prompts/styles/normal.md?raw';
import STYLE_CONCISE from '../../prompts/styles/concise.md?raw';
import STYLE_EXPLANATORY from '../../prompts/styles/explanatory.md?raw';
import STYLE_LEARNING from '../../prompts/styles/learning.md?raw';

// Memory template
import MEMORY_TEMPLATE from '../../prompts/MEMORY.md?raw';

// Maps for dynamic lookup
const AGENTS: Record<string, string> = {
  DEFAULT: AGENT_DEFAULT,
};

const TOOLS: Record<ToolId, string> = {
  WEB_SEARCH: TOOL_WEB_SEARCH,
  URL_FETCH: TOOL_URL_FETCH,
  FILE_READ: TOOL_FILE_READ,
  ASK_QUESTION: TOOL_ASK_QUESTION,
  CONFIRM_ACTION: TOOL_CONFIRM_ACTION,
  RUN_PYTHON: TOOL_RUN_PYTHON,
};

const MODES: Record<ModeId, string> = {
  CANVAS: MODE_CANVAS,
  COUNCIL: MODE_COUNCIL,
};

const STYLES: Record<ResponseStyleId, string> = {
  normal: STYLE_NORMAL,
  concise: STYLE_CONCISE,
  explanatory: STYLE_EXPLANATORY,
  learning: STYLE_LEARNING,
};

export interface AssembledPrompt {
  systemPrompt: string;
  includedFiles: string[];
}

/**
 * Assembles the system prompt based on chat configuration.
 * 
 * Assembly order:
 * 1. MAIN.md (always)
 * 2. Response Style (if not 'normal')
 * 3. Agent (always, defaults to DEFAULT)
 * 4. Memories (if memoryEnabled and memories provided)
 * 5. Date Context (if includeDateContext is true)
 * 6. Tools (for each enabled tool)
 * 7. Mode (if active)
 */
export function assemblePrompt(config: ChatConfig, memories?: { name: string; content: string }[], model?: Model): AssembledPrompt {
  const parts: string[] = [];
  const includedFiles: string[] = [];

  // 1. MAIN.md (always included)
  if (MAIN.trim()) {
    parts.push(MAIN);
    includedFiles.push('MAIN.md');
  }

  // 2. Response Style (inject if not 'normal')
  const styleId = config.responseStyle || 'normal';
  const styleInstructions = STYLES[styleId];
  if (styleInstructions?.trim()) {
    parts.push(styleInstructions);
    includedFiles.push(`styles/${styleId}.md`);
  }

  // 3. Agent (always included, defaults to DEFAULT)
  const agentId = config.agentId || 'DEFAULT';
  const agentPrompt = AGENTS[agentId] || AGENTS.DEFAULT;
  if (agentPrompt.trim()) {
    parts.push(agentPrompt);
    includedFiles.push(`agents/${agentId}.md`);
  }

  // 4. Memories (if memoryEnabled and memories provided)
  if (config.memoryEnabled && memories && memories.length > 0) {
    const memoriesContent = memories.map(m => `## ${m.name}\n${m.content}`).join('\n\n');
    const memoryContent = MEMORY_TEMPLATE.replace('{MEMORIES}', memoriesContent);
    parts.push(memoryContent);
    includedFiles.push('MEMORY.md');
  }

  // 5. Date Context (if enabled - helpful for web search and reasoning about "today")
  if (config.includeDateContext !== false) { // default to true
    const dateContext = getDateContextString();
    parts.push(`## Current Context\n\n${dateContext}`);
    includedFiles.push('DATE_CONTEXT');
  }

  // 6. Tools (conditional, multiple)
  // Skip WEB_SEARCH tool instructions for models with native search
  // (they handle search internally via API config)
  const modelHasNativeSearch = model?.capabilities?.webSearch
  for (const toolId of config.enabledTools) {
    if (modelHasNativeSearch && toolId === 'WEB_SEARCH') continue
    const toolPrompt = TOOLS[toolId];
    if (toolPrompt?.trim()) {
      parts.push(toolPrompt);
      includedFiles.push(`tools/${toolId}.md`);
    }
  }

  // 7. Mode (conditional, one max)
  if (config.mode) {
    const modePrompt = MODES[config.mode];
    if (modePrompt?.trim()) {
      parts.push(modePrompt);
      includedFiles.push(`modes/${config.mode}.md`);
    }
  }

  return {
    systemPrompt: parts.join('\n\n---\n\n'),
    includedFiles,
  };
}

/**
 * Returns the default chat configuration.
 */
export function getDefaultChatConfig(): ChatConfig {
  return {
    agentId: 'DEFAULT',
    memoryEnabled: false,
    enabledTools: ['ASK_QUESTION', 'RUN_PYTHON'],
    mode: null,
    responseStyle: 'normal',
  };
}

/**
 * Registers a custom agent prompt at runtime.
 * Used for user-defined agents.
 */
export function registerAgent(id: string, content: string): void {
  AGENTS[id] = content;
}

/**
 * Gets list of available agent IDs.
 */
export function getAvailableAgents(): string[] {
  return Object.keys(AGENTS);
}

/**
 * Gets list of available tool IDs.
 */
export function getAvailableTools(): ToolId[] {
  return Object.keys(TOOLS) as ToolId[];
}

/**
 * Gets list of available mode IDs.
 */
export function getAvailableModes(): ModeId[] {
  return Object.keys(MODES) as ModeId[];
}
