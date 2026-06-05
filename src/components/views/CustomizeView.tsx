import { useState, useEffect, useCallback, useRef } from 'react'
import { useStore } from '../../store/useStore'
import { Trash2, Plus, ChevronDown, X, GripVertical, Edit2, Check, Search, Wand2, Brain, Palette, Keyboard, Zap, Sliders, RotateCcw, Download, FileDown, Database, HardDrive, Link, Upload, Copy } from 'lucide-react'
import { ICON_MAP, DEFAULT_QUICK_PROMPTS, AVAILABLE_ICONS, type Prompt } from '../../lib/quickPrompts'
import type { ThemeId, Skill } from '../../types'

type CustomizeSection = 'skills' | 'memories' | 'appearance' | 'chat' | 'shortcuts' | 'quick-prompts' | 'connections' | 'database' | 'storage'

const BUILTIN_THEMES: { id: ThemeId; name: string; dark: boolean; previewBg: string; previewText: string }[] = [
  { id: 't-dark', name: 'DARK', dark: true, previewBg: '#1a1a1c', previewText: '#929288' },
  { id: 't-light', name: 'LIGHT', dark: false, previewBg: '#f5f3ef', previewText: '#806858' },
]

const BUILTIN_THEME_TOKENS: Record<string, Record<string, string>> = {
  't-dark': {
    '--bg': '#1a1a1c', '--sb': '#141416', '--sf': '#222226', '--sf2': '#2a2a2e', '--sf3': '#323238',
    '--tx': '#f0f0ea', '--tx2': '#c8c8c0', '--tx3': '#929288', '--tx4': '#525250',
    '--bd': '#353538', '--bd2': '#404044', '--bd3': '#555558',
    '--line': '#404044', '--grid-line': '#353538',
    '--logo': '#f0f0ea',
    '--acc': '#6AB8F7', '--acc-r': '106', '--acc-g': '184', '--acc-b': '247',
    '--acc-hover': 'rgba(106,184,247,.07)', '--acc-active': 'rgba(106,184,247,.10)',
    '--acc-pressed': 'rgba(106,184,247,.12)', '--acc-border': 'rgba(106,184,247,.50)',
    '--acc-glow': 'rgba(106,184,247,.18)', '--acc-soft': 'rgba(106,184,247,.08)',
    '--chip': 'rgba(255,255,255,.05)',
    '--danger': '#f87171', '--danger-bg': '#3a1c1c', '--danger-border': '#5a2828', '--danger-fill': '#f76a6a', '--warning': '#f7a96a',
    '--code-bg': '#2a2a2e', '--code-icon': '#6AB8F7',
    '--white': '#ffffff', '--msg-user-bg': '#2a2a2e', '--msg-user-border': '#404044', '--icon-opacity': '.65',
    '--font': "'Geist Mono', monospace", '--font-d': "'Instrument Serif', serif", '--fs': '14px',
    '--r': '8px', '--r-sm': '6px', '--r-md': '10px', '--r-lg': '14px',
    '--pad-xs': '4px', '--pad-sm': '8px', '--pad-md': '14px', '--pad-lg': '24px', '--pad-xl': '32px',
    '--msg-pad-x': '28px', '--input-pad': '16px', '--sidebar-pad': '10px',
    '--sb-w': '240px', '--topbar-h': '48px', '--msg-max-w': '720px', '--input-max-w': '680px',
    '--ease': '0.2s ease',
  },
  't-light': {
    '--bg': '#f5f3ef', '--sb': '#ede9e2', '--sf': '#fff', '--sf2': '#f5f1ea', '--sf3': '#ede8df',
    '--tx': '#1a1a16', '--tx2': '#504840', '--tx3': '#806858', '--tx4': '#b0a898',
    '--bd': '#e0dbd3', '--bd2': '#d4cec5', '--bd3': '#b8b0a6',
    '--line': '#d4cec5', '--grid-line': '#ded9d0',
    '--logo': '#1a1a16',
    '--acc': '#6AB8F7', '--acc-r': '106', '--acc-g': '184', '--acc-b': '247',
    '--acc-hover': 'rgba(106,184,247,.07)', '--acc-active': 'rgba(106,184,247,.10)',
    '--acc-pressed': 'rgba(106,184,247,.12)', '--acc-border': 'rgba(106,184,247,.50)',
    '--acc-glow': 'rgba(106,184,247,.18)', '--acc-soft': 'rgba(106,184,247,.08)',
    '--chip': 'rgba(0,0,0,.03)',
    '--danger': '#e05555', '--danger-bg': '#fef2f2', '--danger-border': '#fecaca', '--danger-fill': '#f76a6a', '--warning': '#f7a96a',
    '--code-bg': '#EDE8DF', '--code-icon': '#4a9fd4',
    '--white': '#ffffff', '--msg-user-bg': '#ede8df', '--msg-user-border': '#d4cec5', '--icon-opacity': '.65',
    '--font': "'Geist Mono', monospace", '--font-d': "'Instrument Serif', serif", '--fs': '14px',
    '--r': '8px', '--r-sm': '6px', '--r-md': '10px', '--r-lg': '14px',
    '--pad-xs': '4px', '--pad-sm': '8px', '--pad-md': '14px', '--pad-lg': '24px', '--pad-xl': '32px',
    '--msg-pad-x': '28px', '--input-pad': '16px', '--sidebar-pad': '10px',
    '--sb-w': '240px', '--topbar-h': '48px', '--msg-max-w': '720px', '--input-max-w': '680px',
    '--ease': '0.2s ease',
  },
}

const FONT_OPTIONS = [
  { name: 'Geist Mono', value: "'Geist Mono', monospace", preview: 'Aa 0123' },
  { name: 'Instrument Serif', value: "'Instrument Serif', serif", preview: 'Aa 0123' },
  { name: 'Fraunces', value: "'Fraunces', serif", preview: 'Aa 0123' },
  { name: 'System UI', value: "system-ui, -apple-system, sans-serif", preview: 'Aa 0123' },
  { name: 'Inter', value: "'Inter', sans-serif", preview: 'Aa 0123' },
  { name: 'JetBrains Mono', value: "'JetBrains Mono', monospace", preview: 'Aa 0123' },
  { name: 'SF Mono', value: "'SF Mono', monospace", preview: 'Aa 0123' },
  { name: 'DM Mono', value: "'DM Mono', monospace", preview: 'Aa 0123' },
]

function FontDropdown({ label, value, onChange }: { label: string; value: string; onChange: (val: string) => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const selected = FONT_OPTIONS.find(f => f.value === value) || FONT_OPTIONS[0]

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div className="font-dropdown-group" ref={ref}>
      <label className="font-dropdown-label">{label}</label>
      <button className="font-dropdown-trigger" onClick={() => setOpen(!open)}>
        <span className="font-dropdown-selected" style={{ fontFamily: selected.value }}>{selected.name}</span>
        <ChevronDown size={14} className={`font-dropdown-arrow${open ? ' open' : ''}`} />
      </button>
      {open && (
        <div className="font-dropdown-list">
          {FONT_OPTIONS.map((f) => (
            <button
              key={f.name}
              className={`font-dropdown-item${f.value === value ? ' active' : ''}`}
              onClick={() => { onChange(f.value); setOpen(false) }}
            >
              <span className="font-dropdown-name" style={{ fontFamily: f.value }}>{f.name}</span>
              <span className="font-dropdown-preview" style={{ fontFamily: f.value }}>{f.preview}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

const CUSTOM_COLOR_ROWS = [
  { key: '--bg', label: 'Background' },
  { key: '--sb', label: 'Sidebar' },
  { key: '--sf', label: 'Surface' },
  { key: '--tx', label: 'Text' },
]

type DesignerToken = {
  key: string;
  label: string;
  type?: 'color' | 'font' | 'dimension' | 'timing';
}

const DESIGNER_SECTIONS: { label: string; tokens: DesignerToken[] }[] = [
  {
    label: 'Backgrounds',
    tokens: [
      { key: '--bg', label: 'App Background' },
      { key: '--sb', label: 'Sidebar' },
      { key: '--sf', label: 'Surface' },
      { key: '--sf2', label: 'Surface 2 (Hover)' },
      { key: '--sf3', label: 'Surface 3 (Deep)' },
      { key: '--chip', label: 'Chip Background' },
      { key: '--grid-line', label: 'Grid Line' },
    ],
  },
  {
    label: 'Text',
    tokens: [
      { key: '--tx', label: 'Primary' },
      { key: '--tx2', label: 'Secondary' },
      { key: '--tx3', label: 'Tertiary' },
      { key: '--tx4', label: 'Muted' },
      { key: '--white', label: 'White (Contrast)' },
      { key: '--logo', label: 'Logo' },
      { key: '--icon-opacity', label: 'Icon Opacity' },
    ],
  },
  {
    label: 'Borders',
    tokens: [
      { key: '--bd', label: 'Subtle' },
      { key: '--bd2', label: 'Medium' },
      { key: '--bd3', label: 'Strong' },
    ],
  },
  {
    label: 'Lines & Dividers',
    tokens: [
      { key: '--line', label: 'Lines & Dividers' },
      { key: '--grid-line', label: 'Grid Lines' },
    ],
  },
  {
    label: 'Accent',
    tokens: [
      { key: '--acc', label: 'Accent Color' },
      { key: '--acc-hover', label: 'Hover Background' },
      { key: '--acc-active', label: 'Active Background' },
      { key: '--acc-pressed', label: 'Pressed Background' },
      { key: '--acc-border', label: 'Accent Border' },
      { key: '--acc-glow', label: 'Glow Ring' },
      { key: '--acc-soft', label: 'Soft Background' },
    ],
  },
  {
    label: 'Feedback',
    tokens: [
      { key: '--danger', label: 'Error Color' },
      { key: '--danger-bg', label: 'Error Background' },
      { key: '--danger-border', label: 'Error Border' },
      { key: '--danger-fill', label: 'Error Fill' },
      { key: '--warning', label: 'Warning Color' },
    ],
  },
  {
    label: 'Code',
    tokens: [
      { key: '--code-bg', label: 'Inline Code Background' },
      { key: '--code-icon', label: 'Code Action Icons' },
    ],
  },
  {
    label: 'Chat',
    tokens: [
      { key: '--msg-user-bg', label: 'User Message Bubble' },
      { key: '--msg-user-border', label: 'User Message Border' },
    ],
  },
  {
    label: 'Font',
    tokens: [
      { key: '--font', label: 'Body Font', type: 'font' },
      { key: '--font-d', label: 'Heading Font', type: 'font' },
      { key: '--fs', label: 'Base Size', type: 'dimension' },
    ],
  },
  {
    label: 'Radius',
    tokens: [
      { key: '--r', label: 'Default', type: 'dimension' },
      { key: '--r-sm', label: 'Small', type: 'dimension' },
      { key: '--r-md', label: 'Medium', type: 'dimension' },
      { key: '--r-lg', label: 'Large', type: 'dimension' },
    ],
  },
  {
    label: 'Spacing',
    tokens: [
      { key: '--pad-xs', label: 'Extra Small', type: 'dimension' },
      { key: '--pad-sm', label: 'Small', type: 'dimension' },
      { key: '--pad-md', label: 'Medium', type: 'dimension' },
      { key: '--pad-lg', label: 'Large', type: 'dimension' },
      { key: '--pad-xl', label: 'Extra Large', type: 'dimension' },
      { key: '--msg-pad-x', label: 'Message Padding', type: 'dimension' },
      { key: '--input-pad', label: 'Input Padding', type: 'dimension' },
      { key: '--sidebar-pad', label: 'Sidebar Padding', type: 'dimension' },
    ],
  },
  {
    label: 'Layout',
    tokens: [
      { key: '--sb-w', label: 'Sidebar Width', type: 'dimension' },
      { key: '--topbar-h', label: 'Topbar Height', type: 'dimension' },
      { key: '--msg-max-w', label: 'Message Max Width', type: 'dimension' },
      { key: '--input-max-w', label: 'Input Max Width', type: 'dimension' },
    ],
  },
  {
    label: 'Timing',
    tokens: [
      { key: '--ease', label: 'Transition', type: 'timing' },
    ],
  },
]

const TRANSITION_EASES = [
  { value: '0s', label: 'None' },
  { value: '0.1s ease', label: 'Fast' },
  { value: '0.2s ease', label: 'Normal' },
  { value: '0.3s ease', label: 'Slow' },
  { value: '0.5s ease', label: 'Very Slow' },
  { value: '0.1s ease-in', label: 'Ease In' },
  { value: '0.2s ease-out', label: 'Ease Out' },
  { value: '0.3s ease-in-out', label: 'Ease In Out' },
  { value: 'linear', label: 'Linear' },
]

// Modal for adding custom category
function AddCategoryModal({ 
  isOpen, 
  onClose, 
  onAdd 
}: { 
  isOpen: boolean
  onClose: () => void
  onAdd: (label: string, icon: string) => void
}) {
  const [label, setLabel] = useState('')
  const [selectedIcon, setSelectedIcon] = useState('Code')
  const [searchQuery, setSearchQuery] = useState('')

  if (!isOpen) return null

  const filteredIcons = AVAILABLE_ICONS.filter(({ name }) => 
    name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (label.trim()) {
      onAdd(label.trim(), selectedIcon)
      setLabel('')
      setSelectedIcon('Code')
      setSearchQuery('')
      onClose()
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Add Custom Category</h3>
          <button className="modal-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Category Name</label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g., Research, Design, Review"
              className="modal-input"
              autoFocus
            />
          </div>

          <div className="form-group">
            <label>Choose Icon</label>
            <div className="icon-search">
              <Search size={14} className="search-icon" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search icons..."
                className="search-input"
              />
            </div>
            <div className="icon-grid">
              {filteredIcons.map(({ name, icon: Icon }) => (
                <button
                  key={name}
                  type="button"
                  className={`icon-option${selectedIcon === name ? ' selected' : ''}`}
                  onClick={() => setSelectedIcon(name)}
                  title={name}
                >
                  <Icon size={20} />
                </button>
              ))}
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" className="modal-btn secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="modal-btn primary" disabled={!label.trim()}>
              Add Category
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Prompt Editor Component
function PromptEditor({ 
  prompt, 
  onSave, 
  onCancel 
}: { 
  prompt: Prompt
  onSave: (name: string, promptText: string) => void
  onCancel: () => void
}) {
  const [name, setName] = useState(prompt.name)
  const [promptText, setPromptText] = useState(prompt.prompt)

  return (
    <div className="prompt-editor">
      <div className="form-group">
        <label>Display Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Short name shown in dropdown"
          className="modal-input"
        />
      </div>
      <div className="form-group">
        <label>Prompt Text</label>
        <textarea
          value={promptText}
          onChange={(e) => setPromptText(e.target.value)}
          placeholder="The full prompt sent to the AI"
          className="modal-textarea"
          rows={3}
        />
      </div>
      <div className="editor-actions">
        <button className="cp-btn secondary" onClick={onCancel}>Cancel</button>
        <button 
          className="cp-btn primary" 
          onClick={() => onSave(name, promptText)}
          disabled={!name.trim() || !promptText.trim()}
        >
          <Check size={14} /> Save
        </button>
      </div>
    </div>
  )
}

export function CustomizeView() {
  const {
    theme,
    setTheme,
    layoutMode,
    setLayoutMode,
    fontFamily,
    headingFont,
    setFontFamily,
    setHeadingFont,
    memories,
    addMemory,
    updateMemory,
    removeMemory,
    quickPrompts,
    setQuickPrompts,
    addQuickPromptCategory,
    updateQuickPromptCategory,
    removeQuickPromptCategory,
    addQuickPrompt,
    updateQuickPrompt,
    removeQuickPrompt,
    toggleQuickPromptCategory,
    reorderQuickPrompts,
    skills,
    addSkill,
    updateSkill,
    removeSkill,
    inputGlowEnabled,
    setInputGlowEnabled,
    inputGlowColor,
    setInputGlowColor,
  } = useStore()

  const [section, setSection] = useState<CustomizeSection>('quick-prompts')
  const [showAddMemoryModal, setShowAddMemoryModal] = useState(false)
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false)
  const [editingMemory, setEditingMemory] = useState<{ id: string; name: string; content: string } | null>(null)
  const [memoryName, setMemoryName] = useState('')
  const [memoryContent, setMemoryContent] = useState('')
  const [expandedMemory, setExpandedMemory] = useState<string | null>(null)
  const [designerMode, setDesignerMode] = useState(false)
  const [customTokens, setCustomTokens] = useState<Record<string, string>>({})
  const [showSaveThemeModal, setShowSaveThemeModal] = useState(false)
  const [showImportThemeModal, setShowImportThemeModal] = useState(false)
  const [themeToDelete, setThemeToDelete] = useState<string | null>(null)
  const [customThemeName, setCustomThemeName] = useState('')
  const [customThemePreview, setCustomThemePreview] = useState('#333333')
  const [showAddSkillModal, setShowAddSkillModal] = useState(false)
  const [editingSkill, setEditingSkill] = useState<Skill | null>(null)
  const [skillName, setSkillName] = useState('')
  const [skillDescription, setSkillDescription] = useState('')
  const [skillTrigger, setSkillTrigger] = useState('')
  const [skillContent, setSkillContent] = useState('')
  const [skillError, setSkillError] = useState('')
  const [importThemeJson, setImportThemeJson] = useState('')
  const [importThemeName, setImportThemeName] = useState('')
  const [editingThemeName, setEditingThemeName] = useState<string | null>(null)
  const [editThemeName, setEditThemeName] = useState('')
  const [editThemePreview, setEditThemePreview] = useState('#333333')
  const [savedThemes, setSavedThemes] = useState<Record<string, Record<string, string>>>(() => {
    try { return JSON.parse(localStorage.getItem('byte-custom-themes') || '{}') } catch { return {} }
  })
  const [activeThemeTokens, setActiveThemeTokens] = useState<Record<string, string>>({})
  const [activeCustomThemeName, setActiveCustomThemeName] = useState<string | null>(() => {
    try { return localStorage.getItem('byte-active-custom-theme') } catch { return null }
  })

  // Chat settings state
  const [userBubbleStyle, setUserBubbleStyle] = useState<'bubble' | 'plain'>('bubble')
  const [aiMessageStyle, setAiMessageStyle] = useState<'bubble' | 'plain'>('plain')
  const [bubbleRadius, setBubbleRadius] = useState(12)
  const [maxMessageWidth, setMaxMessageWidth] = useState<'default' | 'narrow' | 'wide'>('default')
  const [showSenderName, setShowSenderName] = useState(false)
  const [showTimestamps, setShowTimestamps] = useState(false)
  const [messageGap, setMessageGap] = useState(17)
  const [responseLineHeight, setResponseLineHeight] = useState(1.75)
  const [resetConfirming, setResetConfirming] = useState(false)
  const [resetCountdown, setResetCountdown] = useState(3)

  const getBuiltinTokens = useCallback((themeId: ThemeId) => {
    return BUILTIN_THEME_TOKENS[themeId] || {}
  }, [])

  const clearBodyInlineStyles = useCallback(() => {
    const style = document.body.style
    const propsToRemove: string[] = []
    for (let i = 0; i < style.length; i++) {
      propsToRemove.push(style[i])
    }
    propsToRemove.forEach((prop) => style.removeProperty(prop))
  }, [])

  const applyTokensToCSS = useCallback((tokens: Record<string, string>) => {
    Object.entries(tokens).forEach(([key, value]) => {
      document.body.style.setProperty(key, value)
    })
  }, [])

  // Load builtin tokens + any saved overrides whenever theme changes (including after Zustand hydration)
  useEffect(() => {
    const builtinTokens = getBuiltinTokens(theme)
    try {
      const raw = localStorage.getItem(`byte-overrides-${theme}`)
      if (raw) {
        const overrides = JSON.parse(raw)
        if (Object.keys(overrides).length > 0) {
          clearBodyInlineStyles()
          applyTokensToCSS({ ...builtinTokens, ...overrides })
          setActiveThemeTokens({ ...builtinTokens, ...overrides })
          setCustomTokens(overrides)
          return
        }
      }
    } catch {}
    clearBodyInlineStyles()
    applyTokensToCSS(builtinTokens)
    setActiveThemeTokens(builtinTokens)
    setCustomTokens({})
  }, [theme, getBuiltinTokens, clearBodyInlineStyles, applyTokensToCSS])

  const switchTheme = useCallback((themeId: ThemeId) => {
    setTheme(themeId)
    setActiveCustomThemeName(null)
    try { localStorage.removeItem('byte-active-custom-theme') } catch {}
    setFontFamily(getBuiltinTokens(themeId)['--font'] || fontFamily)
    setHeadingFont(getBuiltinTokens(themeId)['--font-d'] || headingFont)
  }, [setTheme, getBuiltinTokens, fontFamily, headingFont, setFontFamily, setHeadingFont])

  const loadCustomThemeByName = useCallback((name: string) => {
    const tokens = savedThemes[name]
    if (!tokens) return
    setActiveCustomThemeName(name)
    try { localStorage.setItem('byte-active-custom-theme', name) } catch {}
    setActiveThemeTokens(tokens)
    setCustomTokens({})
    clearBodyInlineStyles()
    localStorage.removeItem(`byte-overrides-${theme}`)
    applyTokensToCSS(tokens)
    if (tokens['--font']) setFontFamily(tokens['--font'])
    if (tokens['--font-d']) setHeadingFont(tokens['--font-d'])
  }, [savedThemes, applyTokensToCSS, clearBodyInlineStyles, theme, setFontFamily, setHeadingFont])

  const selectTheme = useCallback((themeId: ThemeId) => {
    switchTheme(themeId)
  }, [switchTheme])

  const selectCustomTheme = useCallback((name: string) => {
    loadCustomThemeByName(name)
  }, [loadCustomThemeByName])

  const updateToken = useCallback((key: string, value: string) => {
    setCustomTokens(prev => {
      const updated = { ...prev, [key]: value }
      document.body.style.setProperty(key, value)

      // Sync accent RGB when accent hex changes
      if (key === '--acc' && value.startsWith('#') && value.length === 7) {
        const r = parseInt(value.slice(1, 3), 16)
        const g = parseInt(value.slice(3, 5), 16)
        const b = parseInt(value.slice(5, 7), 16)
        document.body.style.setProperty('--acc-r', String(r))
        document.body.style.setProperty('--acc-g', String(g))
        document.body.style.setProperty('--acc-b', String(b))
        updated['--acc-r'] = String(r)
        updated['--acc-g'] = String(g)
        updated['--acc-b'] = String(b)
        // Recompute accent states from new accent
        updated['--acc-hover'] = `rgba(${r},${g},${b},.07)`
        updated['--acc-active'] = `rgba(${r},${g},${b},.10)`
        updated['--acc-pressed'] = `rgba(${r},${g},${b},.12)`
        updated['--acc-border'] = `rgba(${r},${g},${b},.50)`
        updated['--acc-glow'] = `rgba(${r},${g},${b},.18)`
        updated['--acc-soft'] = `rgba(${r},${g},${b},.08)`
        document.body.style.setProperty('--acc-hover', updated['--acc-hover'])
        document.body.style.setProperty('--acc-active', updated['--acc-active'])
        document.body.style.setProperty('--acc-pressed', updated['--acc-pressed'])
        document.body.style.setProperty('--acc-border', updated['--acc-border'])
        document.body.style.setProperty('--acc-glow', updated['--acc-glow'])
        document.body.style.setProperty('--acc-soft', updated['--acc-soft'])
      }

      // Sync accent RGB when individual components change
      if (key === '--acc-r' || key === '--acc-g' || key === '--acc-b') {
        const r = key === '--acc-r' ? value : (updated['--acc-r'] || getComputedStyle(document.body).getPropertyValue('--acc-r').trim())
        const g = key === '--acc-g' ? value : (updated['--acc-g'] || getComputedStyle(document.body).getPropertyValue('--acc-g').trim())
        const b = key === '--acc-b' ? value : (updated['--acc-b'] || getComputedStyle(document.body).getPropertyValue('--acc-b').trim())
        const rn = parseInt(String(r)) || 0
        const gn = parseInt(String(g)) || 0
        const bn = parseInt(String(b)) || 0
        updated['--acc-hover'] = `rgba(${rn},${gn},${bn},.07)`
        updated['--acc-active'] = `rgba(${rn},${gn},${bn},.10)`
        updated['--acc-pressed'] = `rgba(${rn},${gn},${bn},.12)`
        updated['--acc-border'] = `rgba(${rn},${gn},${bn},.50)`
        updated['--acc-glow'] = `rgba(${rn},${gn},${bn},.18)`
        updated['--acc-soft'] = `rgba(${rn},${gn},${bn},.08)`
        document.body.style.setProperty('--acc-hover', updated['--acc-hover'])
        document.body.style.setProperty('--acc-active', updated['--acc-active'])
        document.body.style.setProperty('--acc-pressed', updated['--acc-pressed'])
        document.body.style.setProperty('--acc-border', updated['--acc-border'])
        document.body.style.setProperty('--acc-glow', updated['--acc-glow'])
        document.body.style.setProperty('--acc-soft', updated['--acc-soft'])
      }

      // Auto-persist to localStorage
      const storageKey = `byte-overrides-${theme}`
      const allOverrides = { ...localStorage.getItem(storageKey) ? JSON.parse(localStorage.getItem(storageKey) || '{}') : {}, ...updated }
      localStorage.setItem(storageKey, JSON.stringify(allOverrides))

      if (activeCustomThemeName) {
        const merged = { ...savedThemes[activeCustomThemeName], ...updated }
        setActiveThemeTokens(merged)
      } else {
        const merged = { ...getBuiltinTokens(theme), ...updated }
        setActiveThemeTokens(merged)
      }
      return updated
    })
  }, [activeCustomThemeName, savedThemes, theme, getBuiltinTokens])

  const getTokenValue = useCallback((key: string) => {
    if (customTokens[key]) return customTokens[key]
    return activeThemeTokens[key] || getComputedStyle(document.body).getPropertyValue(key).trim()
  }, [activeThemeTokens, customTokens])

  const applyToken = useCallback((key: string) => {
    const current = customTokens[key] || getTokenValue(key)
    const updated = { ...customTokens, [key]: current }
    if (activeCustomThemeName) {
      const saved = savedThemes[activeCustomThemeName] || {}
      const merged = { ...saved, ...updated }
      setActiveThemeTokens(merged)
      const newSaved = { ...savedThemes, [activeCustomThemeName]: merged }
      setSavedThemes(newSaved)
      localStorage.setItem('byte-custom-themes', JSON.stringify(newSaved))
    } else {
      const merged = { ...getBuiltinTokens(theme), ...updated }
      setActiveThemeTokens(merged)
    }
    setCustomTokens(updated)
  }, [customTokens, getTokenValue, activeCustomThemeName, savedThemes, theme, getBuiltinTokens])

  const handleSaveTheme = useCallback(() => {
    if (!customThemeName.trim()) return
    const trimmedName = customThemeName.trim()
    const current = activeCustomThemeName
      ? { ...savedThemes[activeCustomThemeName], ...customTokens }
      : { ...getBuiltinTokens(theme), ...customTokens }
    current.preview = customThemePreview
    const updated = { ...savedThemes, [trimmedName]: current }
    setSavedThemes(updated)
    localStorage.setItem('byte-custom-themes', JSON.stringify(updated))
    setShowSaveThemeModal(false)
    setCustomThemeName('')
    setCustomThemePreview('#333333')
  }, [customThemeName, customThemePreview, activeCustomThemeName, savedThemes, customTokens, theme, getBuiltinTokens])

  const parseSkillMarkdown = (content: string): { name: string; description: string; trigger: string } | null => {
    try {
      const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/)
      if (!frontmatterMatch) return null
      const lines = frontmatterMatch[1].split('\n')
      let name = '', description = '', trigger = ''
      for (const line of lines) {
        const colonIndex = line.indexOf(':')
        if (colonIndex === -1) continue
        const key = line.slice(0, colonIndex).trim()
        const value = line.slice(colonIndex + 1).trim()
        if (key === 'name') name = value
        if (key === 'description') description = value
        if (key === 'trigger') trigger = value
      }
      if (!name) return null
      return { name, description, trigger }
    } catch { return null }
  }

  const handleAddSkill = useCallback(() => {
    if (!skillName.trim()) {
      setSkillError('Skill name is required')
      return
    }
    const newSkill = {
      name: skillName.trim(),
      description: skillDescription.trim(),
      trigger: skillTrigger.trim() || `/${skillName.trim().toLowerCase().replace(/\s+/g, '-')}`,
      content: skillContent,
    }
    addSkill(newSkill)
    setShowAddSkillModal(false)
    setSkillName('')
    setSkillDescription('')
    setSkillTrigger('')
    setSkillContent('')
    setSkillError('')
  }, [skillName, skillDescription, skillTrigger, skillContent, addSkill])

  const handleUpdateSkill = useCallback(() => {
    if (!editingSkill || !skillName.trim()) return
    updateSkill(editingSkill.id, {
      name: skillName.trim(),
      description: skillDescription.trim(),
      trigger: skillTrigger.trim() || `/${skillName.trim().toLowerCase().replace(/\s+/g, '-')}`,
      content: skillContent,
    })
    setEditingSkill(null)
    setSkillName('')
    setSkillDescription('')
    setSkillTrigger('')
    setSkillContent('')
  }, [editingSkill, skillName, skillDescription, skillTrigger, skillContent, updateSkill])

  const openEditSkill = (skill: Skill) => {
    setEditingSkill(skill)
    setSkillName(skill.name)
    setSkillDescription(skill.description)
    setSkillTrigger(skill.trigger)
    setSkillContent(skill.content)
  }

  const handlePasteSkill = useCallback(() => {
    navigator.clipboard.readText().then(text => {
      const parsed = parseSkillMarkdown(text)
      if (parsed) {
        setSkillName(parsed.name)
        setSkillDescription(parsed.description)
        setSkillTrigger(parsed.trigger)
        setSkillContent(text)
      } else {
        setSkillContent(text)
      }
    }).catch(() => {
      setSkillError('Failed to read clipboard')
    })
  }, [])

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target?.result as string
      const parsed = parseSkillMarkdown(text)
      if (parsed) {
        setSkillName(parsed.name)
        setSkillDescription(parsed.description)
        setSkillTrigger(parsed.trigger)
        setSkillContent(text)
      } else {
        setSkillContent(text)
      }
    }
    reader.readAsText(file)
  }, [])

  const handleDeleteTheme = useCallback((name: string) => {
    setThemeToDelete(name)
  }, [])

  const confirmDeleteTheme = useCallback(() => {
    if (!themeToDelete) return
    const updated = { ...savedThemes }
    delete updated[themeToDelete]
    setSavedThemes(updated)
    localStorage.setItem('byte-custom-themes', JSON.stringify(updated))
    if (activeCustomThemeName === themeToDelete) {
      setActiveCustomThemeName(null)
      localStorage.removeItem('byte-active-custom-theme')
      switchTheme(theme)
    }
    setThemeToDelete(null)
  }, [themeToDelete, savedThemes, activeCustomThemeName, theme, setSavedThemes, switchTheme])

  const cancelDeleteTheme = useCallback(() => {
    setThemeToDelete(null)
  }, [])

  const handleResetClick = useCallback(() => {
    if (resetConfirming) {
      // Reset now
      // Reset chat settings
      setUserBubbleStyle('bubble')
      setAiMessageStyle('plain')
      setBubbleRadius(12)
      setMaxMessageWidth('default')
      setShowSenderName(false)
      setShowTimestamps(false)
      setMessageGap(17)
      setResponseLineHeight(1.75)
      
      // Reset theme if preset
      if (!activeCustomThemeName) {
        localStorage.removeItem(`byte-overrides-${theme}`)
        const tokens = getBuiltinTokens(theme)
        clearBodyInlineStyles()
        applyTokensToCSS(tokens)
        setActiveThemeTokens(tokens)
        setCustomTokens({})
      }
      
      setResetConfirming(false)
      setResetCountdown(3)
    } else {
      // Start countdown
      setResetConfirming(true)
    }
  }, [resetConfirming, activeCustomThemeName, theme, getBuiltinTokens, clearBodyInlineStyles, applyTokensToCSS])

  useEffect(() => {
    if (resetConfirming) {
      const timer = setInterval(() => {
        setResetCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer)
            setResetConfirming(false)
            return 3
          }
          return prev - 1
        })
      }, 1000)
      return () => clearInterval(timer)
    }
  }, [resetConfirming])

  useEffect(() => {
    if (!resetConfirming) {
      setResetCountdown(3)
    }
  }, [resetConfirming])

  const handleEditTheme = useCallback((name: string) => {
    const theme = savedThemes[name]
    setEditingThemeName(name)
    setEditThemeName(name)
    setEditThemePreview(theme?.preview || theme?.['--bg'] || '#333333')
  }, [savedThemes])

  const saveEditedTheme = useCallback(() => {
    if (!editingThemeName || !editThemeName.trim() || editThemeName.length > 24) return
    const trimmedName = editThemeName.trim()
    const themeData = savedThemes[editingThemeName]
    if (!themeData) return
    
    const updatedThemes = { ...savedThemes }
    
    if (trimmedName !== editingThemeName) {
      delete updatedThemes[editingThemeName]
    }
    
    updatedThemes[trimmedName] = { ...themeData, preview: editThemePreview }
    
    setSavedThemes(updatedThemes)
    localStorage.setItem('byte-custom-themes', JSON.stringify(updatedThemes))
    
    if (activeCustomThemeName === editingThemeName) {
      setActiveCustomThemeName(trimmedName)
      try { localStorage.setItem('byte-active-custom-theme', trimmedName) } catch {}
    }
    
    setEditingThemeName(null)
    setEditThemeName('')
    setEditThemePreview('#333333')
  }, [editingThemeName, editThemeName, editThemePreview, savedThemes, activeCustomThemeName])

  const cancelEditTheme = useCallback(() => {
    setEditingThemeName(null)
    setEditThemeName('')
    setEditThemePreview('#333333')
  }, [])

  // Quick Prompts state
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null)
  const [editingCategoryLabel, setEditingCategoryLabel] = useState('')
  const [editingPromptId, setEditingPromptId] = useState<string | null>(null)
  const [addingPromptToCategory, setAddingPromptToCategory] = useState<string | null>(null)
  const [newPromptName, setNewPromptName] = useState('')
  const [newPromptText, setNewPromptText] = useState('')

  // Parse placeholders from prompt text ({{key}} syntax)
  const parsePlaceholders = (text: string): { key: string; label: string }[] => {
    const regex = /\{\{([^}]+)\}\}/g
    const placeholders: { key: string; label: string }[] = []
    let match
    while ((match = regex.exec(text)) !== null) {
      const key = match[1].trim()
      if (!placeholders.find(p => p.key === key)) {
        placeholders.push({ key, label: key.charAt(0).toUpperCase() + key.slice(1) })
      }
    }
    return placeholders
  }

  // Drag and drop state
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)

  // Expanded categories
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())

  // Memory handlers
  const handleAddMemory = () => {
    if (memoryName.trim() && memoryContent.trim()) {
      addMemory({ name: memoryName.trim(), content: memoryContent.trim() })
      setMemoryName('')
      setMemoryContent('')
      setShowAddMemoryModal(false)
    }
  }

  const handleUpdateMemory = () => {
    if (editingMemory && memoryName.trim() && memoryContent.trim()) {
      updateMemory(editingMemory.id, { name: memoryName.trim(), content: memoryContent.trim() })
      setEditingMemory(null)
      setMemoryName('')
      setMemoryContent('')
    }
  }

  const handleEditMemory = (mem: { id: string; name: string; content: string }) => {
    setEditingMemory(mem)
    setMemoryName(mem.name)
    setMemoryContent(mem.content)
  }

  const handleDeleteMemory = (id: string) => {
    if (confirm('Delete this memory?')) {
      removeMemory(id)
    }
  }

  const openAddMemoryModal = () => {
    setEditingMemory(null)
    setMemoryName('')
    setMemoryContent('')
    setShowAddMemoryModal(true)
  }

  const closeMemoryModal = () => {
    setShowAddMemoryModal(false)
    setEditingMemory(null)
    setMemoryName('')
    setMemoryContent('')
  }

  // Quick Prompts handlers
  const handleToggleExpand = (id: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleStartEditingCategory = (cat: { id: string; label: string }) => {
    setEditingCategoryId(cat.id)
    setEditingCategoryLabel(cat.label)
  }

  const handleSaveCategoryName = () => {
    if (editingCategoryId && editingCategoryLabel.trim()) {
      updateQuickPromptCategory(editingCategoryId, { label: editingCategoryLabel.trim() })
    }
    setEditingCategoryId(null)
    setEditingCategoryLabel('')
  }

  const handleSavePrompt = (categoryId: string, promptId: string, name: string, prompt: string) => {
    const placeholders = parsePlaceholders(prompt)
    updateQuickPrompt(categoryId, promptId, { name, prompt, placeholders: placeholders.length > 0 ? placeholders : undefined })
    setEditingPromptId(null)
  }

  const handleAddPrompt = (categoryId: string) => {
    if (newPromptName.trim() && newPromptText.trim()) {
      const placeholders = parsePlaceholders(newPromptText.trim())
      addQuickPrompt(categoryId, newPromptName.trim(), newPromptText.trim(), placeholders.length > 0 ? placeholders : undefined)
      setNewPromptName('')
      setNewPromptText('')
      setAddingPromptToCategory(null)
      setExpandedCategories(prev => new Set(prev).add(categoryId))
    }
  }

  const handleAddCategory = (label: string, icon: string) => {
    addQuickPromptCategory({
      label,
      icon,
      prompts: [],
      enabled: true,
    })
  }

  const handleResetToDefaults = () => {
    if (confirm('Reset all quick prompts to defaults? This will replace your current configuration.')) {
      setQuickPrompts(DEFAULT_QUICK_PROMPTS)
    }
  }

  // Drag and drop handlers
  const handleDragStart = (id: string) => {
    setDraggedId(id)
  }

  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault()
    if (id !== draggedId) {
      setDragOverId(id)
    }
  }

  const handleDragLeave = () => {
    setDragOverId(null)
  }

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault()
    setDragOverId(null)
    if (!draggedId || draggedId === targetId) return

    const fromIndex = quickPrompts.findIndex(c => c.id === draggedId)
    const toIndex = quickPrompts.findIndex(c => c.id === targetId)
    if (fromIndex !== -1 && toIndex !== -1) {
      reorderQuickPrompts(fromIndex, toIndex)
    }
    setDraggedId(null)
  }

  const handleDragEnd = () => {
    setDraggedId(null)
    setDragOverId(null)
  }

  // Close editing states on escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setEditingCategoryId(null)
        setEditingPromptId(null)
        setAddingPromptToCategory(null)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  const sidebarItems: { id: CustomizeSection; label: string; icon: React.ElementType }[] = [
    { id: 'skills', label: 'Skills', icon: Wand2 },
    { id: 'memories', label: 'Memories', icon: Brain },
    { id: 'appearance', label: 'Appearance', icon: Palette },
    { id: 'shortcuts', label: 'Shortcuts', icon: Keyboard },
    { id: 'quick-prompts', label: 'Quick Prompts', icon: Zap },
    { id: 'connections', label: 'Connections', icon: Link },
    { id: 'database', label: 'Database', icon: Database },
    { id: 'storage', label: 'Storage', icon: HardDrive },
  ]

  return (
    <div className="view customize on">
      <div className="cust-lay">
        <div className="cust-inner">
          <nav className="cust-snav">
            {sidebarItems.map(item => (
              <button
                key={item.id}
                className={`cust-si${section === item.id ? ' on' : ''}`}
                onClick={() => setSection(item.id)}
              >
                {item.label}
              </button>
            ))}
          </nav>

          <div className="cust-body">
            {section === 'skills' && (
              <div className="cust-sec on">
                <div className="cp-header">
                  <div>
                    <h2 className="cp-title-main"><Wand2 size={20} /> Skills</h2>
                    <p className="cp-desc">Reusable prompt templates with AI context. Use /skill-name to call or AI auto-triggers based on descriptions.</p>
                  </div>
                </div>

                <div className="cp-toolbar">
                  <span className="cp-hint">{skills.length} skill{skills.length !== 1 ? 's' : ''}</span>
                  <div className="cp-actions">
                    <button className="cp-btn primary" onClick={() => setShowAddSkillModal(true)}>
                      <Plus size={14} /> Add skill
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {skills.length === 0 ? (
                    <div style={{ padding: 40, textAlign: 'center', color: 'var(--tx3)' }}>
                      No skills yet. Add a skill to get started.
                    </div>
                  ) : (
                    skills.map(skill => (
                      <div
                        key={skill.id}
                        style={{
                          padding: 14,
                          background: 'var(--sf)',
                          border: '1px solid var(--bd)',
                          borderRadius: 'var(--r)',
                          cursor: 'pointer',
                          transition: 'border-color 0.15s ease',
                        }}
                        onClick={() => openEditSkill(skill)}
                        onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--acc)' }}
                        onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--bd)' }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                          <div style={{ fontWeight: 600, color: 'var(--tx)', fontSize: 'calc(var(--fs))' }}>{skill.name}</div>
                          <code style={{ fontSize: 'calc(var(--fs) - 2px)', color: 'var(--acc)', background: 'var(--sf2)', padding: '2px 6px', borderRadius: 4 }}>{skill.trigger}</code>
                        </div>
                        {skill.description && (
                          <div style={{ fontSize: 'calc(var(--fs) - 1px)', color: 'var(--tx2)', marginBottom: 8 }}>{skill.description}</div>
                        )}
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button
                            className="btn btn-sm"
                            onClick={(e) => { e.stopPropagation(); openEditSkill(skill) }}
                          >
                            <Edit2 size={12} /> Edit
                          </button>
                          <button
                            className="btn btn-sm"
                            style={{ color: 'var(--danger)', borderColor: 'var(--danger-border)' }}
                            onClick={(e) => { e.stopPropagation(); removeSkill(skill.id) }}
                          >
                            <Trash2 size={12} /> Delete
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
            {section === 'quick-prompts' && (
              <div className="cust-sec on">
                <div className="cp-header">
                  <div>
                    <h2 className="cp-title-main"><Zap size={20} /> Quick Prompts</h2>
                    <p className="cp-desc">Manage the prompt buttons shown on the home screen. Drag to reorder. Click a prompt to expand its options.</p>
                  </div>
                </div>

                <div className="cp-toolbar">
                  <span className="cp-hint">Drag handle to reorder</span>
                  <div className="cp-actions">
                    <button className="cp-btn secondary" onClick={handleResetToDefaults}>
                      Reset to defaults
                    </button>
                    <button
                      className="cp-btn primary"
                      onClick={() => setShowAddCategoryModal(true)}
                    >
                      <Plus size={14} /> Add custom
                    </button>
                  </div>
                </div>

                <div className="cp-list">
                  {quickPrompts.map((cat) => {
                    const Icon = ICON_MAP[cat.icon] || ICON_MAP.Code
                    const isExpanded = expandedCategories.has(cat.id)
                    const isDragOver = dragOverId === cat.id
                    const isDragging = draggedId === cat.id
                    const isEditing = editingCategoryId === cat.id

                    return (
                      <div
                        key={cat.id}
                        className={`cp-item${cat.enabled ? '' : ' disabled'}${isDragOver ? ' drag-over' : ''}${isDragging ? ' dragging' : ''}`}
                        draggable
                        onDragStart={() => handleDragStart(cat.id)}
                        onDragOver={(e) => handleDragOver(e, cat.id)}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(e, cat.id)}
                        onDragEnd={handleDragEnd}
                      >
                        <div className="cp-item-main" onClick={() => handleToggleExpand(cat.id)}>
                          <div className="cp-drag-handle">
                            <GripVertical size={16} />
                          </div>
                          <div className="cp-item-icon">
                            <Icon size={16} />
                          </div>
                          {isEditing ? (
                            <div className="cp-edit-inline">
                              <input
                                type="text"
                                value={editingCategoryLabel}
                                onChange={(e) => setEditingCategoryLabel(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleSaveCategoryName()
                                  if (e.key === 'Escape') {
                                    setEditingCategoryId(null)
                                    setEditingCategoryLabel('')
                                  }
                                }}
                                onClick={(e) => e.stopPropagation()}
                                autoFocus
                              />
                              <button onClick={handleSaveCategoryName} className="cp-btn-icon">
                                <Check size={14} />
                              </button>
                            </div>
                          ) : (
                            <span className="cp-item-name">{cat.label}</span>
                          )}
                          <span className="cp-item-meta">{cat.prompts.length} prompts</span>
                          <label className="cp-toggle" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={cat.enabled}
                              onChange={() => toggleQuickPromptCategory(cat.id)}
                            />
                            <span className="cp-toggle-slider" />
                          </label>
                          <button
                            className={`cp-expand${isExpanded ? ' expanded' : ''}`}
                            onClick={(e) => {
                              e.stopPropagation()
                              handleToggleExpand(cat.id)
                            }}
                          >
                            <ChevronDown size={16} />
                          </button>
                        </div>

                        {isExpanded && (
                          <div className="cp-item-expand">
                            <div className="cp-prompts">
                              {cat.prompts.map((prompt) => {
                                const isEditingPrompt = editingPromptId === prompt.id
                                return (
                                  <div key={prompt.id} className="cp-prompt">
                                    {isEditingPrompt ? (
                                      <PromptEditor
                                        prompt={prompt}
                                        onSave={(name, promptText) => handleSavePrompt(cat.id, prompt.id, name, promptText)}
                                        onCancel={() => setEditingPromptId(null)}
                                      />
                                    ) : (
                                      <>
                                        <div className="cp-prompt-info">
                                          <span className="cp-prompt-name">{prompt.name}</span>
                                          <span className="cp-prompt-preview">{prompt.prompt}</span>
                                        </div>
                                        <div className="cp-prompt-actions">
                                          <button
                                            className="cp-btn-icon"
                                            onClick={() => setEditingPromptId(prompt.id)}
                                            title="Edit prompt"
                                          >
                                            <Edit2 size={12} />
                                          </button>
                                          <button
                                            className="cp-btn-icon delete"
                                            onClick={() => removeQuickPrompt(cat.id, prompt.id)}
                                            title="Delete prompt"
                                          >
                                            <X size={12} />
                                          </button>
                                        </div>
                                      </>
                                    )}
                                  </div>
                                )
                              })}

                              {addingPromptToCategory === cat.id ? (
                                <div className="prompt-editor">
                                  <div className="form-group">
                                    <label>Display Name</label>
                                    <input
                                      type="text"
                                      value={newPromptName}
                                      onChange={(e) => setNewPromptName(e.target.value)}
                                      placeholder="e.g., Condense, Analyze, Draft"
                                      className="modal-input"
                                      autoFocus
                                    />
                                  </div>
                                  <div className="form-group">
                                    <label>Prompt Text</label>
                                    <textarea
                                      value={newPromptText}
                                      onChange={(e) => setNewPromptText(e.target.value)}
                                      placeholder="The full prompt sent to the AI... Use {{variable}} for placeholders"
                                      className="modal-textarea"
                                      rows={2}
                                    />
                                    <div className="form-hint">Use {"{{variable}}"} syntax for placeholders, e.g., {"{{class}} {{topic}}"}</div>
                                  </div>
                                  <div className="editor-actions">
                                    <button 
                                      className="cp-btn secondary" 
                                      onClick={() => {
                                        setAddingPromptToCategory(null)
                                        setNewPromptName('')
                                        setNewPromptText('')
                                      }}
                                    >
                                      Cancel
                                    </button>
                                    <button 
                                      className="cp-btn primary" 
                                      onClick={() => handleAddPrompt(cat.id)}
                                      disabled={!newPromptName.trim() || !newPromptText.trim()}
                                    >
                                      <Plus size={14} /> Add Prompt
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <button
                                  className="cp-add-btn"
                                  onClick={() => setAddingPromptToCategory(cat.id)}
                                >
                                  <Plus size={14} /> Add prompt
                                </button>
                              )}
                            </div>

                            <div className="cp-item-footer">
                              <button
                                className="cp-btn-text"
                                onClick={() => handleStartEditingCategory(cat)}
                              >
                                <Edit2 size={14} /> Rename category
                              </button>
                              <button
                                className="cp-btn-text delete"
                                onClick={() => {
                                  if (confirm(`Delete "${cat.label}" category?`)) {
                                    removeQuickPromptCategory(cat.id)
                                  }
                                }}
                              >
                                <Trash2 size={14} /> Delete category
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {section === 'memories' && (
              <div className="cust-sec on">
                <div className="cp-header">
                  <div>
                    <h2 className="cp-title-main"><Brain size={20} /> Memories</h2>
                    <p className="cp-desc">Memories help Byte remember important information across conversations. Click a memory to expand and view its content.</p>
                  </div>
                </div>

                <div className="cp-toolbar">
                  <span className="cp-hint">{memories.length} memory{memories.length !== 1 ? 'ies' : 'y'} saved</span>
                  <button className="cp-btn primary" onClick={openAddMemoryModal}>
                    <Plus size={14} /> Add Memory
                  </button>
                </div>

                <div className="cp-list">
                  {memories.length === 0 && (
                    <div className="customize-empty">
                      <p>No memories saved yet.</p>
                      <button className="cp-btn primary" onClick={openAddMemoryModal}>Add your first memory</button>
                    </div>
                  )}

                  {memories.map((mem) => {
                    const isExpanded = expandedMemory === mem.id
                    
                    return (
                      <div 
                        key={mem.id} 
                        className={`cp-item${isExpanded ? ' expanded' : ''}`}
                      >
                        <div 
                          className="cp-item-main"
                          onClick={() => setExpandedMemory(isExpanded ? null : mem.id)}
                        >
                          <div className="cp-item-icon">
                            <Brain size={14} />
                          </div>
                          <span className="cp-item-name">{mem.name}</span>
                          <button
                            className={`cp-expand${isExpanded ? ' expanded' : ''}`}
                            onClick={(e) => {
                              e.stopPropagation()
                              setExpandedMemory(isExpanded ? null : mem.id)
                            }}
                          >
                            <ChevronDown size={16} />
                          </button>
                        </div>

                        {isExpanded && (
                          <div className="cp-item-expand">
                            <div className="mem-content">{mem.content}</div>
                            <div className="cp-item-footer">
                              <button
                                type="button"
                                className="cp-btn secondary"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  handleEditMemory(mem);
                                }}
                              >
                                <Edit2 size={14} /> Edit
                              </button>
                              <button
                                type="button"
                                className="cp-btn danger"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  handleDeleteMemory(mem.id);
                                }}
                              >
                                <Trash2 size={14} /> Delete
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {section === 'appearance' && (
              <div className="cust-sec on">
                <div className="cp-header">
                  <div>
                    <h2 className="cp-title-main"><Palette size={20} /> Appearance</h2>
                    <p className="cp-desc">Themes, colors, fonts, and layout.</p>
                  </div>
                </div>

                {/* Theme Selector */}
                <h3 className="app-section-label">Theme</h3>
                <div className="theme-selector-row">
                  {BUILTIN_THEMES.map((t) => {
                    const isActive = theme === t.id && !activeCustomThemeName
                    return (
                      <button
                        key={t.id}
                        className={`theme-card-sm${isActive ? ' active' : ''}`}
                        style={{ background: t.previewBg, color: t.previewText }}
                        onClick={() => selectTheme(t.id)}
                      >
                        {t.name}
                      </button>
                    )
                  })}
                  {Object.entries(savedThemes).map(([name, tokens]) => {
                    const isActive = activeCustomThemeName === name
                    const previewColor = tokens.preview || tokens['--bg'] || '#333333'
                    return (
                      <div key={name} className={`theme-card-sm-wrapper${isActive ? ' active' : ''}`}>
                        <button
                          className={`theme-card-sm theme-card-custom${isActive ? ' active' : ''}`}
                          style={{ background: previewColor, color: tokens['--tx3'] || '#888' }}
                          onClick={() => selectCustomTheme(name)}
                          title={name}
                        >
                          {name.slice(0, 2).toUpperCase()}
                        </button>
                        <div className="theme-card-actions">
                          <button
                            className="theme-card-edit"
                            onClick={(e) => { e.stopPropagation(); handleEditTheme(name) }}
                            title={`Edit ${name}`}
                          >
                            <Edit2 size={10} />
                          </button>
                          <button
                            className="theme-card-delete"
                            onClick={(e) => { e.stopPropagation(); handleDeleteTheme(name) }}
                            title={`Delete ${name}`}
                          >
                            <X size={10} />
                          </button>
                        </div>
                      </div>
                    )
                  })}
                  <button
                    className="theme-card-sm theme-card-add"
                    onClick={() => { setDesignerMode(true); setShowSaveThemeModal(true) }}
                  >
                    <Plus size={16} />
                  </button>
                </div>

{/* Import / Export Row */}
                <div className="theme-actions-row">
                  <button className="theme-import-btn" onClick={() => setShowImportThemeModal(true)}>
                    <Download size={13} /> Import .bytetheme file
                  </button>
                  <button className="cp-btn secondary" onClick={() => {
                    const allTokens: Record<string, string> = {}
                    DESIGNER_SECTIONS.forEach((g) => g.tokens.forEach((t) => {
                      allTokens[t.key] = customTokens[t.key] || getTokenValue(t.key)
                    }))
                    allTokens['--layoutMode'] = layoutMode
                    allTokens['--fontFamily'] = fontFamily
                    allTokens['--headingFont'] = headingFont
                    
                    const themeName = activeCustomThemeName || customThemeName.trim() || `Theme ${new Date().toLocaleDateString()}`
                    const themePreview = activeCustomThemeName 
                      ? (savedThemes[activeCustomThemeName]?.preview || savedThemes[activeCustomThemeName]?.['--bg'] || '#333333')
                      : (customTokens['--bg'] || getTokenValue('--bg') || '#333333')
                    
                    allTokens['name'] = themeName
                    allTokens['preview'] = themePreview
                    
                    const blob = new Blob([JSON.stringify(allTokens, null, 2)], { type: 'application/json' })
                    const url = URL.createObjectURL(blob)
                    const a = document.createElement('a')
                    a.href = url
                    a.download = `${themeName.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.bytetheme`
                    a.click()
                    URL.revokeObjectURL(url)
                  }}>
                    <FileDown size={13} /> Download
                  </button>
                </div>

                {/* Accent Color */}
                <h3 className="app-section-label">Accent</h3>
                <div className="accent-row">
                  {(() => {
                    const ACCENT_PRESETS = ['#6AB8F7','#f0508c','#50c878','#ffc464','#a78bfa','#f97316','#ef4444','#14b8a6','#8b5cf6','#ec4899','#6366f1','#84cc16']
                    const currentAccent = customTokens['--acc'] || getTokenValue('--acc')
                    const isCustomAccent = !ACCENT_PRESETS.includes(currentAccent)
                    return <>
                      {ACCENT_PRESETS.map((c) => (
                        <button
                          key={c}
                          className={`accent-swatch${(customTokens['--acc'] || getTokenValue('--acc')) === c ? ' active' : ''}`}
                          style={{ background: c, border: c === '#ffffff' || c === '#f0f0ea' || c.toLowerCase() === '#fff' || c.toLowerCase() === '#ffffff' ? '1px solid var(--bd)' : '2px solid transparent' }}
                          onClick={() => {
                            updateToken('--acc', c)
                          }}
                        />
                      ))}
                      <label className={`accent-swatch custom-accent${isCustomAccent ? ' active' : ''}`} title="Custom color" style={{ background: isCustomAccent ? currentAccent : undefined }}>
                        <input
                          type="color"
                          value={customTokens['--acc'] || getTokenValue('--acc')}
                          onChange={(e) => {
                            updateToken('--acc', e.target.value)
                          }}
                        />
                      </label>
                    </>
                  })()}
                </div>

                {/* Logo Color */}
                <h3 className="app-section-label">Logo</h3>
                <div className="accent-row">
                  {['#f0f0ea','#1a1a16','#6AB8F7','#f0508c','#50c878','#ffc464','#a78bfa','#ffffff','#000000'].map((c) => (
                    <button
                      key={c}
                      className={`accent-swatch${(customTokens['--logo'] || getTokenValue('--logo')) === c ? ' active' : ''}`}
                      style={{ background: c, border: c === '#ffffff' || c === '#f0f0ea' || c === '#000000' || c === '#1a1a16' || c === '#000' ? '1px solid var(--bd)' : undefined }}
                      onClick={() => {
                        updateToken('--logo', c)
                      }}
                    />
                  ))}
                  {(() => {
                    const currentLogo = customTokens['--logo'] || getTokenValue('--logo')
                    const LOGO_PRESETS = ['#f0f0ea','#1a1a16','#6AB8F7','#f0508c','#50c878','#ffc464','#a78bfa','#ffffff','#000000']
                    const isCustomLogo = !LOGO_PRESETS.includes(currentLogo)
                    return (
                      <label className={`accent-swatch custom-accent${isCustomLogo ? ' active' : ''}`} title="Custom color" style={{ background: isCustomLogo ? currentLogo : undefined }}>
                        <input
                          type="color"
                          value={customTokens['--logo'] || getTokenValue('--logo')}
                          onChange={(e) => {
                            updateToken('--logo', e.target.value)
                          }}
                        />
                      </label>
                    )
                  })()}
                </div>

                {/* Custom Colors */}
                <h3 className="app-section-label">Custom Colors</h3>
                <div className="custom-colors-list">
                  {CUSTOM_COLOR_ROWS.map((row) => {
                    const val = customTokens[row.key] || getTokenValue(row.key)
                    return (
                      <div key={row.key} className="custom-color-row">
                        <span className="custom-color-label">{row.label}</span>
                        <input
                          type="color"
                          className="custom-color-picker"
                          value={val.startsWith('#') ? val : '#000000'}
                          onChange={(e) => {
                            updateToken(row.key, e.target.value)
                            const hexInput = document.getElementById(`hex-${row.key}`) as HTMLInputElement
                            if (hexInput) hexInput.value = e.target.value.toUpperCase()
                          }}
                        />
                        <input
                          type="text"
                          className="custom-color-input"
                          id={`hex-${row.key}`}
                          value={val.startsWith('#') ? val.toUpperCase() : val}
                          onChange={(e) => updateToken(row.key, e.target.value)}
                        />
                        <button
                          className="custom-color-apply"
                          onClick={() => applyToken(row.key)}
                        >
                          Apply
                        </button>
                      </div>
                    )
                  })}
                </div>

                {/* Font */}
                <h3 className="app-section-label">Font</h3>
                <div className="font-dropdowns">
                  <FontDropdown
                    label="Body Font"
                    value={fontFamily}
                    onChange={(val) => { setFontFamily(val); updateToken('--font', val) }}
                  />
                  <FontDropdown
                    label="Heading Font"
                    value={headingFont}
                    onChange={(val) => { setHeadingFont(val); updateToken('--font-d', val) }}
                  />
                </div>

                {/* Spacing */}
                <h3 className="app-section-label">Spacing</h3>
                <div className="spacing-sliders">
                  <div className="slider-row">
                    <div className="slider-top">
                      <span className="slider-label">Font size</span>
                      <span className="slider-val">{getTokenValue('--fs') || '14px'}</span>
                    </div>
                    <input
                      type="range"
                      min="11"
                      max="18"
                      defaultValue={parseInt(getTokenValue('--fs') || '14')}
                      onInput={(e) => updateToken('--fs', `${(e.target as HTMLInputElement).value}px`)}
                    />
                  </div>
                  <div className="slider-row">
                    <div className="slider-top">
                      <span className="slider-label">Corner radius</span>
                      <span className="slider-val">{getTokenValue('--r') || '8px'}</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="22"
                      defaultValue={parseInt(getTokenValue('--r') || '8')}
                      onInput={(e) => {
                        const v = `${(e.target as HTMLInputElement).value}px`
                        updateToken('--r', v)
                        updateToken('--r-sm', `${Math.max(0, parseInt(v) - 2)}px`)
                        updateToken('--r-md', `${Math.max(0, parseInt(v) + 2)}px`)
                        updateToken('--r-lg', `${Math.max(0, parseInt(v) + 6)}px`)
                      }}
                    />
                  </div>
                  <div className="slider-row">
                    <div className="slider-top">
                      <span className="slider-label">Sidebar width</span>
                      <span className="slider-val">{getTokenValue('--sb-w') || '240px'}</span>
                    </div>
                    <input
                      type="range"
                      min="180"
                      max="320"
                      defaultValue={parseInt(getTokenValue('--sb-w') || '240')}
                      onInput={(e) => updateToken('--sb-w', `${(e.target as HTMLInputElement).value}px`)}
                    />
                  </div>
                </div>

                {/* Layout */}
                <h3 className="app-section-label" style={{ marginTop: 18 }}>Layout</h3>
                <div className="layout-buttons">
                  {(['full', 'icons', 'none'] as const).map((mode) => (
                    <button
                      key={mode}
                      className={`layout-btn${layoutMode === mode ? ' active' : ''}`}
                      onClick={() => setLayoutMode(mode)}
                    >
                      {mode === 'full' ? 'Sidebar' : mode === 'icons' ? 'Icons' : 'None'}
                    </button>
                  ))}
                </div>

                {/* Chat */}
                <h3 className="app-section-label" style={{ marginTop: 24 }}>Chat</h3>
                <div className="chat-preview-container">
                  <div className="chat-preview-bubble ai">
                    <span>Here's what I found about that topic — it's quite nuanced.</span>
                  </div>
                  <div className="chat-preview-bubble user">
                    <span>Can you explain it more simply?</span>
                  </div>
                </div>

                <h4 className="chat-section-label">Message Bubbles</h4>
                <div className="chat-setting-row">
                  <div className="chat-setting-label">
                    <span>User bubble style</span>
                  </div>
                  <select
                    className="chat-setting-select"
                    value={userBubbleStyle}
                    onChange={(e) => setUserBubbleStyle(e.target.value as 'bubble' | 'plain')}
                  >
                    <option value="bubble">Bubble (rounded)</option>
                    <option value="plain">Plain text</option>
                  </select>
                </div>
                <div className="chat-setting-row">
                  <div className="chat-setting-label">
                    <span>AI message style</span>
                  </div>
                  <select
                    className="chat-setting-select"
                    value={aiMessageStyle}
                    onChange={(e) => setAiMessageStyle(e.target.value as 'bubble' | 'plain')}
                  >
                    <option value="plain">Plain text</option>
                    <option value="bubble">Bubble (rounded)</option>
                  </select>
                </div>
                <div className="chat-setting-row">
                  <div className="chat-setting-label">
                    <span>Bubble corner radius</span>
                    <span className="chat-setting-desc">Controls message bubble roundness</span>
                  </div>
                  <div className="chat-setting-control">
                    <input
                      type="range"
                      min="0"
                      max="24"
                      value={bubbleRadius}
                      onChange={(e) => setBubbleRadius(parseInt(e.target.value))}
                      className="chat-slider"
                    />
                    <span className="chat-setting-value">{bubbleRadius}px</span>
                  </div>
                </div>
                <div className="chat-setting-row">
                  <div className="chat-setting-label">
                    <span>Max message width</span>
                  </div>
                  <select
                    className="chat-setting-select"
                    value={maxMessageWidth}
                    onChange={(e) => setMaxMessageWidth(e.target.value as 'default' | 'narrow' | 'wide')}
                  >
                    <option value="default">Default (720px)</option>
                    <option value="narrow">Narrow (560px)</option>
                    <option value="wide">Wide (900px)</option>
                  </select>
                </div>

                <h4 className="chat-section-label" style={{ marginTop: 16 }}>Avatars & Labels</h4>
                <div className="chat-setting-row">
                  <div className="chat-setting-label">
                    <span>Show sender name</span>
                    <span className="chat-setting-desc">Display "Byte" / "You" above messages</span>
                  </div>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={showSenderName}
                      onChange={(e) => setShowSenderName(e.target.checked)}
                    />
                    <span className="toggle-slider" />
                  </label>
                </div>
                <div className="chat-setting-row">
                  <div className="chat-setting-label">
                    <span>Show timestamps</span>
                    <span className="chat-setting-desc">Relative time under each message</span>
                  </div>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={showTimestamps}
                      onChange={(e) => setShowTimestamps(e.target.checked)}
                    />
                    <span className="toggle-slider" />
                  </label>
                </div>

                <h4 className="chat-section-label" style={{ marginTop: 16 }}>Message Spacing</h4>
                <div className="chat-setting-row">
                  <div className="chat-setting-label">
                    <span>Message gap</span>
                    <span className="chat-setting-desc">Space between consecutive messages</span>
                  </div>
                  <div className="chat-setting-control">
                    <input
                      type="range"
                      min="4"
                      max="32"
                      value={messageGap}
                      onChange={(e) => setMessageGap(parseInt(e.target.value))}
                      className="chat-slider"
                    />
                    <span className="chat-setting-value">{messageGap}px</span>
                  </div>
                </div>
                <div className="chat-setting-row">
                  <div className="chat-setting-label">
                    <span>Response line height</span>
                  </div>
                  <div className="chat-setting-control">
                    <input
                      type="range"
                      min="1"
                      max="2.5"
                      step="0.05"
                      value={responseLineHeight}
                      onChange={(e) => setResponseLineHeight(parseFloat(e.target.value))}
                      className="chat-slider"
                    />
                    <span className="chat-setting-value">{responseLineHeight.toFixed(2)}</span>
                  </div>
                </div>

                <button
                  className="reset-all-btn"
                  style={{ marginTop: 16 }}
                  onClick={handleResetClick}
                  disabled={resetConfirming && resetCountdown > 0}
                >
                  {resetConfirming
                    ? `Click again in ${resetCountdown}s to reset`
                    : 'Reset to defaults'}
                </button>

                {/* Input Glow */}
                <h3 className="app-section-label" style={{ marginTop: 24 }}>Input Glow</h3>
                <div className="chat-setting-row">
                  <div className="chat-setting-label">
                    <span>Glow effect</span>
                    <span className="chat-setting-desc">Soft glow around the chat input</span>
                  </div>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={inputGlowEnabled}
                      onChange={(e) => setInputGlowEnabled(e.target.checked)}
                    />
                    <span className="toggle-slider" />
                  </label>
                </div>
                {inputGlowEnabled && (
                  <div className="chat-setting-row">
                    <div className="chat-setting-label">
                      <span>Glow color</span>
                    </div>
                    <div className="chat-setting-control" style={{ gap: 8 }}>
                      <input
                        type="color"
                        value={inputGlowColor}
                        onChange={(e) => setInputGlowColor(e.target.value)}
                        style={{ width: 28, height: 28, border: 'none', borderRadius: 6, cursor: 'pointer', padding: 0 }}
                      />
                      <span style={{ fontSize: 11, color: 'var(--tx3)', fontFamily: 'var(--font)' }}>{inputGlowColor}</span>
                    </div>
                  </div>
                )}

                {/* Designer Mode Toggle */}
                <div className="designer-toggle-area" style={{ marginTop: 32 }}>
                  <button
                    className={`designer-toggle${designerMode ? ' active' : ''}`}
                    onClick={() => setDesignerMode(!designerMode)}
                  >
                    <Sliders size={14} />
                    Designer Mode
                  </button>
                  {designerMode && !activeCustomThemeName && (
                    <div className="designer-actions">
                      <button className="cp-btn secondary" onClick={() => {
                        clearBodyInlineStyles()
                        localStorage.removeItem(`byte-overrides-${theme}`)
                        const base = getBuiltinTokens(theme)
                        applyTokensToCSS(base)
                        setCustomTokens({})
                        setActiveThemeTokens(base)
                      }}>
                        <RotateCcw size={12} /> Reset
                      </button>
                    </div>
                  )}
                </div>

                {/* Designer Mode Panel */}
                {designerMode && (
                  <div className="designer-panel">
                    <div className="designer-sticky">
                      <div className="designer-header">
                        <span>Theme Designer</span>
                      </div>
                      <div className="designer-preview">
                        <h4 className="designer-group-title">Preview</h4>
                      <div className="preview-cards">
                        <div className="preview-card" style={{ background: getTokenValue('--sf'), borderColor: getTokenValue('--bd2') }}>
                          <div className="preview-card-title" style={{ color: getTokenValue('--tx') }}>Surface Card</div>
                          <div className="preview-card-text" style={{ color: getTokenValue('--tx2') }}>Primary text on surface</div>
                          <div className="preview-card-meta" style={{ color: getTokenValue('--tx4') }}>Metadata · Secondary text</div>
                        </div>
                        <div className="preview-card" style={{ background: getTokenValue('--sf2'), borderColor: getTokenValue('--bd') }}>
                          <div className="preview-card-title" style={{ color: getTokenValue('--tx') }}>Elements</div>
                          <div className="preview-card-text" style={{ color: getTokenValue('--tx3') }}>Muted descriptions here</div>
                          <div className="preview-chip" style={{ background: getTokenValue('--chip'), color: getTokenValue('--tx3'), borderColor: getTokenValue('--bd') }}>Chip</div>
                        </div>
                        <div className="preview-card" style={{ background: getTokenValue('--bg'), borderColor: getTokenValue('--bd') }}>
                          <div className="preview-card-title" style={{ color: getTokenValue('--tx') }}>Background</div>
                          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 4 }}>
                            <div className="preview-chip" style={{ background: getTokenValue('--acc-hover'), color: getTokenValue('--tx'), borderColor: getTokenValue('--bd') }}>Hover</div>
                            <div className="preview-chip" style={{ background: getTokenValue('--acc'), color: getTokenValue('--white'), borderColor: 'transparent' }}>Accent</div>
                          </div>
                          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 4 }}>
                            <div className="preview-chip" style={{ background: getTokenValue('--danger-bg'), color: getTokenValue('--danger'), borderColor: getTokenValue('--danger-border') }}>Danger</div>
                            <div className="preview-chip" style={{ background: getTokenValue('--sf2'), color: getTokenValue('--warning'), borderColor: getTokenValue('--bd') }}>Warning</div>
                          </div>
                        </div>
                      </div>
                      <div className="preview-typography">
                        <div style={{ fontFamily: getTokenValue('--font-d'), color: getTokenValue('--tx'), fontSize: '18px' }}>Heading Font Preview</div>
                        <div style={{ fontFamily: getTokenValue('--font'), color: getTokenValue('--tx2'), fontSize: '14px' }}>Body text sample with 0123456789</div>
                        <div style={{ fontFamily: getTokenValue('--font'), color: getTokenValue('--tx3'), fontSize: '12px' }}>Small text and metadata</div>
                        <div style={{ fontFamily: 'Geist Mono, monospace', color: getTokenValue('--tx2'), fontSize: '12px', background: getTokenValue('--code-bg'), padding: '4px 8px', borderRadius: '4px', marginTop: 4 }}>Inline code token preview</div>
                      </div>
                      <div className="preview-colors">
                        <div className="preview-swatch" style={{ background: getTokenValue('--bg'), borderColor: getTokenValue('--bd') }}><span style={{ color: getTokenValue('--tx'), fontSize: 8 }}>BG</span></div>
                        <div className="preview-swatch" style={{ background: getTokenValue('--sb'), borderColor: getTokenValue('--bd') }}><span style={{ color: getTokenValue('--tx'), fontSize: 8 }}>SB</span></div>
                        <div className="preview-swatch" style={{ background: getTokenValue('--sf') }}><span style={{ color: getTokenValue('--tx'), fontSize: 8 }}>SF</span></div>
                        <div className="preview-swatch" style={{ background: getTokenValue('--sf2') }}><span style={{ color: getTokenValue('--tx2'), fontSize: 8 }}>SF2</span></div>
                        <div className="preview-swatch" style={{ background: getTokenValue('--acc') }}><span style={{ color: getTokenValue('--white'), fontSize: 8 }}>ACC</span></div>
                        <div className="preview-swatch" style={{ background: getTokenValue('--danger') }}><span style={{ color: getTokenValue('--white'), fontSize: 8 }}>!</span></div>
                        <div className="preview-swatch" style={{ background: getTokenValue('--warning') }}><span style={{ color: getTokenValue('--white'), fontSize: 8 }}>⚠</span></div>
                      </div>
                    </div>
                    </div>

                    {DESIGNER_SECTIONS.map((group) => (
                      <div key={group.label} className="designer-group">
                        <h4 className="designer-group-title">{group.label}</h4>
                        <div className="designer-tokens">
                          {group.tokens.map((token) => {
                            const val = customTokens[token.key] || getTokenValue(token.key)
                            const isColorType = token.type === 'color' || (!token.type && token.key.startsWith('--') && !['--font', '--font-d', '--fs', '--sb-w', '--topbar-h', '--ease', '--r', '--r-sm', '--r-md', '--r-lg'].includes(token.key))
                            const isFontType = token.type === 'font'
                            const isTimingType = token.type === 'timing'
                            const isDimensionType = token.type === 'dimension'
                            
                            const parseRgba = (v: string) => {
                              const match = v.match(/rgba?\((\d+),(\d+),(\d+),?([\d.]+)?\)/)
                              if (match) {
                                const r = parseInt(match[1])
                                const g = parseInt(match[2])
                                const b = parseInt(match[3])
                                const a = match[4] ? parseFloat(match[4]) : 1
                                return { r, g, b, a: Math.round(a * 100) / 100 }
                              }
                              return { r: 0, g: 0, b: 0, a: 1 }
                            }
                            
                            const isRgba = val.startsWith('rgba')
                            const rgba = isRgba ? parseRgba(val) : { r: 0, g: 0, b: 0, a: 1 }
                            const hexFromRgba = isRgba ? `#${rgba.r.toString(16).padStart(2, '0')}${rgba.g.toString(16).padStart(2, '0')}${rgba.b.toString(16).padStart(2, '0')}` : '#000000'
                            
                            return (
                              <div key={token.key} className="designer-token-row">
                                <label className="designer-label">{token.label}</label>
                                <div className="designer-input-row">
                                  {isColorType && (
                                    <div className="designer-color-control">
                                      <input
                                        type="color"
                                        className="designer-color"
                                        value={isRgba ? hexFromRgba : (val.startsWith('#') ? val : '#000000')}
                                        onChange={(e) => {
                                          if (isRgba) {
                                            const r = parseInt(e.target.value.slice(1, 3), 16)
                                            const g = parseInt(e.target.value.slice(3, 5), 16)
                                            const b = parseInt(e.target.value.slice(5, 7), 16)
                                            updateToken(token.key, `rgba(${r},${g},${b},${rgba.a})`)
                                          } else {
                                            updateToken(token.key, e.target.value)
                                          }
                                        }}
                                      />
                                      {isRgba && (
                                        <div className="designer-opacity-control">
                                          <input
                                            type="range"
                                            className="designer-opacity-slider"
                                            min="0"
                                            max="100"
                                            value={Math.round(rgba.a * 100)}
                                            onInput={(e) => {
                                              const a = parseInt((e.target as HTMLInputElement).value) / 100
                                              updateToken(token.key, `rgba(${rgba.r},${rgba.g},${rgba.b},${a.toFixed(2)})`)
                                            }}
                                          />
                                          <span className="designer-opacity-val">{Math.round(rgba.a * 100)}%</span>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                  {isFontType && (
                                    <FontDropdown
                                      label=""
                                      value={val}
                                      onChange={(v) => {
                                        if (token.key === '--font') setFontFamily(v)
                                        if (token.key === '--font-d') setHeadingFont(v)
                                        updateToken(token.key, v)
                                      }}
                                    />
                                  )}
                                  {isTimingType && (
                                    <select
                                      className="designer-select-wide"
                                      value={val}
                                      onChange={(e) => updateToken(token.key, e.target.value)}
                                    >
                                      {TRANSITION_EASES.map((e) => (
                                        <option key={e.value} value={e.value}>{e.label}</option>
                                      ))}
                                    </select>
                                  )}
                                  {isDimensionType && (
                                    <div className="designer-dimension">
                                      <input
                                        type="number"
                                        className="designer-number"
                                        value={parseInt(val) || 0}
                                        onChange={(e) => updateToken(token.key, `${e.target.value}px`)}
                                      />
                                      <span className="designer-dim-unit">px</span>
                                    </div>
                                  )}
                                  {!isFontType && !isTimingType && !isDimensionType && (
                                    <input
                                      type="text"
                                      className="designer-text"
                                      value={val}
                                      onChange={(e) => updateToken(token.key, e.target.value)}
                                    />
                                  )}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Save Theme Modal */}
                {showSaveThemeModal && (
                  <div className="modal-overlay" onClick={() => { setShowSaveThemeModal(false); setCustomThemeName(''); setCustomThemePreview('#333333') }}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                      <div className="modal-header">
                        <h3>Save Theme</h3>
                        <button className="modal-close" onClick={() => { setShowSaveThemeModal(false); setCustomThemeName(''); setCustomThemePreview('#333333') }}>
                          <X size={18} />
                        </button>
                      </div>
                      <div className="form-group">
                        <label>Theme Name</label>
                        <input
                          type="text"
                          className="modal-input"
                          value={customThemeName}
                          onChange={(e) => setCustomThemeName(e.target.value)}
                          placeholder="e.g. My Custom Dark"
                          autoFocus
                          onKeyDown={(e) => { if (e.key === 'Enter') handleSaveTheme() }}
                        />
                        {customThemeName.length > 24 && (
                          <div className="form-error">Name must be 24 characters or less</div>
                        )}
                      </div>
                      <div className="form-group">
                        <label>Theme Preview Color</label>
                        <div className="theme-preview-picker">
                          <input
                            type="color"
                            className="color-picker-square"
                            value={customThemePreview}
                            onChange={(e) => setCustomThemePreview(e.target.value)}
                          />
                          <input
                            type="text"
                            className="modal-input theme-preview-hex"
                            value={customThemePreview}
                            onChange={(e) => setCustomThemePreview(e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="modal-actions">
                        <button className="modal-btn secondary" onClick={() => { setShowSaveThemeModal(false); setCustomThemeName(''); setCustomThemePreview('#333333') }}>Cancel</button>
                        <button className="modal-btn primary" onClick={handleSaveTheme} disabled={!customThemeName.trim() || customThemeName.length > 24}>Save Theme</button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Import Theme Modal */}
                {showImportThemeModal && (
                  <div className="modal-overlay" onClick={() => { setShowImportThemeModal(false); setImportThemeJson(''); setImportThemeName('') }}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                      <div className="modal-header">
                        <h3>Import Theme</h3>
                        <button className="modal-close" onClick={() => { setShowImportThemeModal(false); setImportThemeJson(''); setImportThemeName('') }}>
                          <X size={18} />
                        </button>
                      </div>
                      <div className="form-group">
                        <label>Theme Name</label>
                        <input
                          type="text"
                          className="modal-input"
                          value={importThemeName}
                          onChange={(e) => setImportThemeName(e.target.value)}
                          placeholder="My Custom Theme"
                          autoFocus
                        />
                      </div>
                      <div className="form-group">
                        <label>Upload .bytetheme file</label>
                        <input
                          type="file"
                          accept=".bytetheme,.json"
                          className="modal-file-input"
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (!file) return
                            const reader = new FileReader()
                            reader.onload = (ev) => {
                              try {
                                const parsed = JSON.parse(ev.target?.result as string)
                                if (typeof parsed !== 'object' || parsed === null) throw new Error('Invalid format')
                                setImportThemeJson(JSON.stringify(parsed, null, 2))
                                if (parsed.name && !importThemeName) setImportThemeName(parsed.name)
                              } catch {
                                alert('Invalid file format')
                              }
                            }
                            reader.readAsText(file)
                          }}
                        />
                      </div>
                      <div className="form-group">
                        <label>Or paste theme JSON</label>
                        <textarea
                          className="modal-textarea"
                          value={importThemeJson}
                          onChange={(e) => setImportThemeJson(e.target.value)}
                          placeholder='{"--bg":"#fff","--sb":"#eee",...}'
                          rows={5}
                        />
                      </div>
                      <div className="modal-actions">
                        <button className="modal-btn secondary" onClick={() => { setShowImportThemeModal(false); setImportThemeJson(''); setImportThemeName('') }}>Cancel</button>
                        <button className="modal-btn primary" onClick={() => {
                          try {
                            const parsed = JSON.parse(importThemeJson)
                            if (typeof parsed !== 'object' || parsed === null) throw new Error('Invalid format')
                            
                            const themeName = importThemeName.trim() || parsed.name || `Imported ${new Date().toLocaleTimeString()}`
                            const tokensToSave: Record<string, string> = {}
                            
                            Object.entries(parsed).forEach(([key, value]) => {
                              if (key.startsWith('--') || key === '--layoutMode' || key === '--fontFamily' || key === '--headingFont') {
                                tokensToSave[key] = value as string
                              }
                            })
                            
                            const updated = { ...savedThemes, [themeName]: tokensToSave }
                            setSavedThemes(updated)
                            localStorage.setItem('byte-custom-themes', JSON.stringify(updated))
                            
                            loadCustomThemeByName(themeName)
                            
                            setShowImportThemeModal(false)
                            setImportThemeJson('')
                            setImportThemeName('')
                          } catch {
                            alert('Invalid theme JSON. Please paste a valid theme object.')
                          }
                        }} disabled={!importThemeJson.trim()}>Import as New Theme</button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {section === 'shortcuts' && (
              <div className="cust-sec on">
                <h2 className="cp-title-main"><Keyboard size={20} /> Shortcuts</h2>
                <p className="cp-desc">Keyboard shortcuts for quick access.</p>
                <div className="customize-empty">
                  <p>Shortcuts coming soon...</p>
                </div>
              </div>
            )}

            {section === 'connections' && (
              <div className="cust-sec on">
                <h2 className="cp-title-main"><Link size={20} /> Connections</h2>
                <p className="cp-desc">Manage external service connections and integrations.</p>
                <div className="customize-empty">
                  <p>Coming soon...</p>
                </div>
              </div>
            )}

            {section === 'database' && (
              <div className="cust-sec on">
                <h2 className="cp-title-main"><Database size={20} /> Database</h2>
                <p className="cp-desc">Configure database connections and settings.</p>
                <div className="customize-empty">
                  <p>Coming soon...</p>
                </div>
              </div>
            )}

            {section === 'storage' && (
              <div className="cust-sec on">
                <h2 className="cp-title-main"><HardDrive size={20} /> Storage</h2>
                <p className="cp-desc">Manage storage providers and file settings.</p>
                <div className="customize-empty">
                  <p>Coming soon...</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Category Modal */}
      <AddCategoryModal
        isOpen={showAddCategoryModal}
        onClose={() => setShowAddCategoryModal(false)}
        onAdd={handleAddCategory}
      />

      {/* Memory Modal */}
      {(showAddMemoryModal || editingMemory) && (
        <div className="modal-overlay" onClick={closeMemoryModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingMemory ? 'Edit Memory' : 'Add Memory'}</h3>
              <button className="modal-close" onClick={closeMemoryModal}>
                <X size={18} />
              </button>
            </div>
            <div className="form-group">
              <label>Name</label>
              <input
                type="text"
                placeholder="e.g., Project Ideas, Preferences"
                value={memoryName}
                onChange={(e) => setMemoryName(e.target.value)}
                className="modal-input"
              />
            </div>
            <div className="form-group">
              <label>Content</label>
              <textarea
                placeholder="What should Byte remember?"
                value={memoryContent}
                onChange={(e) => setMemoryContent(e.target.value)}
                className="modal-textarea"
                rows={5}
              />
            </div>
            <div className="modal-actions">
              <button className="modal-btn secondary" onClick={closeMemoryModal}>
                Cancel
              </button>
              <button
                className="modal-btn primary"
                onClick={editingMemory ? handleUpdateMemory : handleAddMemory}
                disabled={!memoryName.trim() || !memoryContent.trim()}
              >
                {editingMemory ? 'Save Changes' : 'Add Memory'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Theme Modal */}
      {themeToDelete && (
        <div className="modal-overlay" onClick={cancelDeleteTheme}>
          <div className="modal modal-sm" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Delete Theme</h3>
              <button className="modal-close" onClick={cancelDeleteTheme}>
                <X size={18} />
              </button>
            </div>
            <div className="modal-body-confirm">
              <div className="modal-confirm-icon">
                <Trash2 size={24} />
              </div>
              <p className="modal-confirm-text">
                Delete <strong>"{themeToDelete}"</strong>? This cannot be undone.
              </p>
            </div>
            <div className="modal-actions">
              <button className="modal-btn secondary" onClick={cancelDeleteTheme}>
                Cancel
              </button>
              <button
                className="modal-btn danger"
                onClick={confirmDeleteTheme}
              >
                Delete Theme
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Theme Modal */}
      {editingThemeName && (
        <div className="modal-overlay" onClick={cancelEditTheme}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Edit Theme</h3>
              <button className="modal-close" onClick={cancelEditTheme}>
                <X size={18} />
              </button>
            </div>
            <div className="form-group">
              <label>Theme Name</label>
              <input
                type="text"
                className="modal-input"
                value={editThemeName}
                onChange={(e) => setEditThemeName(e.target.value)}
                placeholder="Theme name"
                autoFocus
              />
              {editThemeName.length > 24 && (
                <div className="form-error">Name must be 24 characters or less</div>
              )}
            </div>
            <div className="form-group">
              <label>Theme Preview Color</label>
              <div className="theme-preview-picker">
                <input
                  type="color"
                  className="color-picker-square"
                  value={editThemePreview}
                  onChange={(e) => setEditThemePreview(e.target.value)}
                />
                <input
                  type="text"
                  className="modal-input theme-preview-hex"
                  value={editThemePreview}
                  onChange={(e) => setEditThemePreview(e.target.value)}
                />
              </div>
            </div>
            <div className="modal-actions">
              <button className="modal-btn secondary" onClick={cancelEditTheme}>Cancel</button>
              <button 
                className="modal-btn primary" 
                onClick={saveEditedTheme}
                disabled={!editThemeName.trim() || editThemeName.length > 24}
              >
Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Skill Modal */}
      {(showAddSkillModal || editingSkill) && (
        <div className="modal-overlay" onClick={() => { setShowAddSkillModal(false); setEditingSkill(null); setSkillName(''); setSkillDescription(''); setSkillTrigger(''); setSkillContent(''); setSkillError('') }}>
          <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingSkill ? 'Edit Skill' : 'Add Skill'}</h3>
              <button className="modal-close" onClick={() => { setShowAddSkillModal(false); setEditingSkill(null); setSkillName(''); setSkillDescription(''); setSkillTrigger(''); setSkillContent('') }}>
                <X size={18} />
              </button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', gap: 12 }}>
                <button className="cp-btn secondary" onClick={handlePasteSkill} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <Copy size={14} /> Paste markdown
                </button>
                <label style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer', background: 'var(--sf2)', border: '1px solid var(--bd)', borderRadius: 'var(--r-sm)', padding: '10px 14px', fontSize: 'calc(var(--fs) - 1px)', color: 'var(--tx2)' }}>
                  <Upload size={14} /> Upload .md
                  <input type="file" accept=".md,.markdown" onChange={handleFileUpload} style={{ display: 'none' }} />
                </label>
              </div>
              <div>
                <label style={{ fontSize: 'calc(var(--fs) - 1.5px)', color: 'var(--tx2)', marginBottom: 4, display: 'block' }}>Name *</label>
                <input type="text" className="modal-input" placeholder="Code Review" value={skillName} onChange={(e) => setSkillName(e.target.value)} />
              </div>
              <div>
                <label style={{ fontSize: 'calc(var(--fs) - 1.5px)', color: 'var(--tx2)', marginBottom: 4, display: 'block' }}>Description</label>
                <input type="text" className="modal-input" placeholder="Review code for bugs and performance" value={skillDescription} onChange={(e) => setSkillDescription(e.target.value)} />
              </div>
              <div>
                <label style={{ fontSize: 'calc(var(--fs) - 1.5px)', color: 'var(--tx2)', marginBottom: 4, display: 'block' }}>Trigger</label>
                <input type="text" className="modal-input" placeholder="/review-code" value={skillTrigger} onChange={(e) => setSkillTrigger(e.target.value)} />
              </div>
              <div>
                <label style={{ fontSize: 'calc(var(--fs) - 1.5px)', color: 'var(--tx2)', marginBottom: 4, display: 'block' }}>Content (markdown)</label>
                <textarea className="modal-textarea" placeholder="---name: Code Review..." value={skillContent} onChange={(e) => setSkillContent(e.target.value)} style={{ minHeight: 200, fontFamily: 'var(--font)', fontSize: 'calc(var(--fs) - 1px)' }} />
              </div>
              {skillError && <div style={{ color: 'var(--danger)', fontSize: 'calc(var(--fs) - 1px)' }}>{skillError}</div>}
            </div>
            <div className="modal-actions">
              <button className="modal-btn secondary" onClick={() => { setShowAddSkillModal(false); setEditingSkill(null); setSkillName(''); setSkillDescription(''); setSkillTrigger(''); setSkillContent('') }}>Cancel</button>
              <button className="modal-btn primary" onClick={editingSkill ? handleUpdateSkill : handleAddSkill}>{editingSkill ? 'Save Changes' : 'Add Skill'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
