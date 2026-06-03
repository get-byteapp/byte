import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  Plus, Paperclip, Camera, Folder, BookOpen, Zap, Search, Pen, ChevronRight, Check, X, Brain, Info, Terminal,
} from 'lucide-react'
import { getProjectIcon } from '../../lib/projectIcons'
import type { ResponseStyleId, Project } from '../../types'

interface PlusMenuProps {
  onAddFiles: () => void
  onScreenshot: () => void
  onSkills: () => void
  onAddConnectors: () => void
  onStyleChange: (style: ResponseStyleId) => void
  currentStyle: ResponseStyleId
  webSearchEnabled?: boolean
  onWebSearchToggle?: (enabled: boolean) => void
  memoryEnabled?: boolean
  onMemoryToggle?: (enabled: boolean) => void
  direction?: 'up' | 'down'
  modelCanWebSearch?: boolean
  langSearchApiKey?: string
  onNavigateToConnections?: () => void
  projects?: Project[]
  activeChatId?: string | null
  onAddChatToProject?: (projectId: string) => void
  onRemoveChatFromProject?: (projectId: string, chatId: string) => void
  operationMode?: boolean
  onOperationToggle?: (enabled: boolean) => void
}

// Menu position can use either top or bottom for vertical positioning
interface MenuPosition {
  left: number
  top?: number
  bottom?: number
}

export function PlusMenu({
  onAddFiles,
  onScreenshot,
  onSkills,
  onAddConnectors,
  onStyleChange,
  currentStyle,
  webSearchEnabled = false,
  onWebSearchToggle,
  memoryEnabled = false,
  onMemoryToggle,
  direction = 'down',
  modelCanWebSearch = false,
  langSearchApiKey,
  onNavigateToConnections,
  projects,
  activeChatId,
  onAddChatToProject,
  onRemoveChatFromProject,
  operationMode = false,
  onOperationToggle,
}: PlusMenuProps) {
  const [showMenu, setShowMenu] = useState(false)
  const [showStyleSubmenu, setShowStyleSubmenu] = useState(false)
  const [showProjectSubmenu, setShowProjectSubmenu] = useState(false)
  const [isStyleBtnHovered, setIsStyleBtnHovered] = useState(false)
  const [showApiKeyModal, setShowApiKeyModal] = useState(false)
  const [menuPosition, setMenuPosition] = useState<MenuPosition>({ left: 0, top: 0 })
  const btnRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const styleItemRef = useRef<HTMLButtonElement>(null)
  const styleSubmenuRef = useRef<HTMLDivElement>(null)
  const styleIndicatorRef = useRef<HTMLButtonElement>(null)
  const projectItemRef = useRef<HTMLButtonElement>(null)
  const projectSubmenuRef = useRef<HTMLDivElement>(null)

  // Sync open class with showMenu state
  useEffect(() => {
    if (showMenu) {
      btnRef.current?.classList.add('open')
    } else {
      btnRef.current?.classList.remove('open')
    }
  }, [showMenu])

  // Handle click outside to close menu
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node
      const isOutsideDropdown = !dropdownRef.current || !dropdownRef.current.contains(target)
      const isOutsideBtn = !btnRef.current || !btnRef.current.contains(target)
      const isOutsideStyleIndicator = !styleIndicatorRef.current || !styleIndicatorRef.current.contains(target)
      const isOutsideStyleSubmenu = !styleSubmenuRef.current || !styleSubmenuRef.current.contains(target)
      const isOutsideProjectSubmenu = !projectSubmenuRef.current || !projectSubmenuRef.current.contains(target)
      const isOutsideProjectItem = !projectItemRef.current || !projectItemRef.current.contains(target)
      
      if (isOutsideDropdown && isOutsideBtn && isOutsideStyleIndicator && isOutsideStyleSubmenu && isOutsideProjectSubmenu && isOutsideProjectItem) {
        setShowMenu(false)
        setShowStyleSubmenu(false)
        setShowProjectSubmenu(false)
      }
    }
    if (showMenu || showStyleSubmenu || showProjectSubmenu) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showMenu, showStyleSubmenu, showProjectSubmenu])

  // Calculate position when showing menu - useLayoutEffect for synchronous DOM updates
  useLayoutEffect(() => {
    if (showMenu && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect()
      const spacing = 6

      if (direction === 'up') {
        // Position above the button using bottom (like the mockup)
        // bottom = distance from viewport bottom to where menu bottom should be
        // menu bottom should be just above the button top
        setMenuPosition({
          bottom: window.innerHeight - rect.top + spacing,
          left: rect.left,
          top: undefined,
        })
      } else {
        // Position below the button using top
        setMenuPosition({
          top: rect.bottom + spacing,
          left: rect.left,
          bottom: undefined,
        })
      }
    }
  }, [showMenu, direction])

  const toggleMenu = () => {
    setShowMenu(!showMenu)
  }

  const handleStyleReset = () => {
    onStyleChange('normal')
    setShowStyleSubmenu(false)
  }

  const MenuItem = ({ icon: Icon, label, onClick, hasArrow = false, isToggle = false, isActive = false, info }: {
    icon: React.ComponentType<{ size: number }>, label: string, onClick: () => void, hasArrow?: boolean, isToggle?: boolean, isActive?: boolean, info?: string
  }) => (
    <button
      onClick={onClick}
      className="pm-item"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        width: '100%',
        padding: '6px 9px',
        borderRadius: 'var(--r-sm)',
        border: 'none',
        background: 'transparent',
        cursor: 'pointer',
        fontFamily: 'var(--font)',
        fontSize: 12,
        color: isActive ? 'rgba(var(--acc-r),var(--acc-g),var(--acc-b),1)' : 'var(--tx2)',
        textAlign: 'left',
        transition: 'background 0.1s, color 0.1s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'rgba(var(--acc-r),var(--acc-g),var(--acc-b),.09)'
        e.currentTarget.style.color = isActive ? 'rgba(var(--acc-r),var(--acc-g),var(--acc-b),1)' : 'var(--tx)'
        const icon = e.currentTarget.querySelector('.pm-icon') as HTMLElement
        if (icon) icon.style.color = isActive ? 'rgba(var(--acc-r),var(--acc-g),var(--acc-b),1)' : 'var(--tx2)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'transparent'
        e.currentTarget.style.color = isActive ? 'rgba(var(--acc-r),var(--acc-g),var(--acc-b),1)' : 'var(--tx2)'
        const icon = e.currentTarget.querySelector('.pm-icon') as HTMLElement
        if (icon) icon.style.color = isActive ? 'rgba(var(--acc-r),var(--acc-g),var(--acc-b),1)' : 'var(--tx3)'
      }}
    >
      <span className="pm-icon" style={{
        width: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0, color: isActive ? 'rgba(var(--acc-r),var(--acc-g),var(--acc-b),1)' : 'var(--tx3)',
      }}>
        <Icon size={14} />
      </span>
      <span className="pm-label" style={{ flex: 1 }}>{label}</span>
      {info && (
        <span className="pm-info" style={{ color: 'var(--tx4)', flexShrink: 0, display: 'flex', alignItems: 'center' }} title={info}>
          <Info size={11} />
        </span>
      )}
      {hasArrow && <span className="pm-arrow" style={{ color: 'var(--tx4)', flexShrink: 0 }}>
        <ChevronRight size={10} />
      </span>}
      {isToggle && isActive && <span className="pm-check" style={{
        color: 'rgba(var(--acc-r),var(--acc-g),var(--acc-b),1)',
        flexShrink: 0,
      }}>
        <Check size={11} />
      </span>}
    </button>
  )

  const Divider = () => <div style={{ height: 1, background: 'var(--bd)', margin: '3px 5px' }} />

  // Style options for the submenu
  const STYLE_OPTIONS: { id: ResponseStyleId; label: string }[] = [
    { id: 'normal', label: 'Normal' },
    { id: 'concise', label: 'Concise' },
    { id: 'explanatory', label: 'Explanatory' },
    { id: 'learning', label: 'Learning' },
  ]

  // Render style submenu - rendered inline (not portal) so hover works between button and submenu
  // Positioned with bottom: 0 so the LAST option aligns with the button
  const renderStyleSubmenu = () => {
    if (!showStyleSubmenu) return null

    return (
      <div
        ref={styleSubmenuRef}
        style={{
          position: 'absolute',
          bottom: 0,
          left: '100%',
          marginLeft: 0,
          background: 'var(--sf)',
          border: '1px solid var(--bd2)',
          borderRadius: 'var(--r)',
          padding: '4px',
          minWidth: 140,
          boxShadow: '0 6px 24px rgba(0,0,0,.14), 0 1px 4px rgba(0,0,0,.08)',
          animation: 'dropDown 0.12s ease',
          zIndex: 951,
        }}
        onMouseEnter={() => setShowStyleSubmenu(true)}
        onMouseLeave={() => setShowStyleSubmenu(false)}
      >
        {STYLE_OPTIONS.map((option) => (
          <button
            key={option.id}
            onClick={() => {
              onStyleChange(option.id)
              setShowStyleSubmenu(false)
              setShowMenu(false)
              btnRef.current?.classList.remove('open')
            }}
            className="pm-item"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              width: '100%',
              padding: '6px 9px',
              borderRadius: 'var(--r-sm)',
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              fontFamily: 'var(--font)',
              fontSize: 12,
              color: currentStyle === option.id ? 'rgba(var(--acc-r),var(--acc-g),var(--acc-b),1)' : 'var(--tx2)',
              textAlign: 'left',
              transition: 'background 0.1s, color 0.1s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(var(--acc-r),var(--acc-g),var(--acc-b),.09)'
              e.currentTarget.style.color = currentStyle === option.id ? 'rgba(var(--acc-r),var(--acc-g),var(--acc-b),1)' : 'var(--tx)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.color = currentStyle === option.id ? 'rgba(var(--acc-r),var(--acc-g),var(--acc-b),1)' : 'var(--tx2)'
            }}
          >
            <span style={{ flex: 1 }}>{option.label}</span>
            {currentStyle === option.id && (
              <span style={{ color: 'rgba(var(--acc-r),var(--acc-g),var(--acc-b),1)', flexShrink: 0 }}>
                <Check size={11} />
              </span>
            )}
          </button>
        ))}
      </div>
    )
  }

  // Render project submenu
  const renderProjectSubmenu = () => {
    if (!showProjectSubmenu) return null

    const activeProjects = (projects || []).filter((p) => p.status === 'active')

    return (
      <div
        ref={projectSubmenuRef}
        style={{
          position: 'absolute',
          bottom: 0,
          left: '100%',
          marginLeft: 0,
          background: 'var(--sf)',
          border: '1px solid var(--bd2)',
          borderRadius: 'var(--r)',
          padding: '4px',
          minWidth: 160,
          maxHeight: 110,
          overflowY: 'auto',
          boxShadow: '0 6px 24px rgba(0,0,0,.14), 0 1px 4px rgba(0,0,0,.08)',
          animation: 'dropDown 0.12s ease',
          zIndex: 951,
        }}
        onMouseEnter={() => setShowProjectSubmenu(true)}
        onMouseLeave={() => setShowProjectSubmenu(false)}
      >
        {activeProjects.length === 0 ? (
          <div style={{ padding: '8px 10px', fontSize: 12, color: 'var(--tx4)', textAlign: 'center' }}>
            No active projects
          </div>
        ) : (
          activeProjects.map((project) => {
            const isInProject = activeChatId ? project.chatIds.includes(activeChatId) : false
            const ProjectIcon = getProjectIcon(project.icon)
            return (
              <button
                key={project.id}
                onClick={() => {
                  if (isInProject) {
                    onRemoveChatFromProject?.(project.id, activeChatId!)
                  } else {
                    onAddChatToProject?.(project.id)
                  }
                  setShowProjectSubmenu(false)
                  setShowMenu(false)
                  btnRef.current?.classList.remove('open')
                }}
                className="pm-item"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  width: '100%',
                  padding: '6px 9px',
                  borderRadius: 'var(--r-sm)',
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  fontFamily: 'var(--font)',
                  fontSize: 12,
                  color: 'var(--tx2)',
                  textAlign: 'left',
                  transition: 'background 0.1s, color 0.1s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(var(--acc-r),var(--acc-g),var(--acc-b),.09)'
                  e.currentTarget.style.color = 'var(--tx)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent'
                  e.currentTarget.style.color = 'var(--tx2)'
                }}
              >
                <span style={{ width: 16, height: 16, borderRadius: 4, backgroundColor: project.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <ProjectIcon size={8} color="white" />
                </span>
                <span style={{ flex: 1 }}>{project.name}</span>
                {isInProject && <X size={10} style={{ color: 'var(--tx4)' }} />}
                {!isInProject && <Plus size={10} style={{ color: 'var(--tx4)' }} />}
              </button>
            )
          })
        )}
      </div>
    )
  }

  // Render the dropdown menu using a portal to avoid transform containment issues
  const renderDropdown = () => {
    if (!showMenu) return null

    const dropdown = (
      <div
        ref={dropdownRef}
        style={{
          position: 'fixed',
          ...(menuPosition.top !== undefined ? { top: menuPosition.top } : {}),
          ...(menuPosition.bottom !== undefined ? { bottom: menuPosition.bottom } : {}),
          left: menuPosition.left,
          background: 'var(--sf)',
          border: '1px solid var(--bd2)',
          borderRadius: 'var(--r)',
          padding: '4px',
          minWidth: 188,
          boxShadow: '0 6px 24px rgba(0,0,0,.14), 0 1px 4px rgba(0,0,0,.08)',
          animation: direction === 'up' ? 'dropUp 0.12s ease' : 'dropDown 0.12s ease',
          zIndex: 950,
        }}
      >
        <MenuItem icon={Paperclip} label="Add files or photos" onClick={() => { onAddFiles(); setShowMenu(false) }} />
        <MenuItem icon={Camera} label="Take a screenshot" onClick={() => { onScreenshot(); setShowMenu(false) }} />
        <div
            style={{ position: 'relative' }}
            onMouseEnter={() => setShowProjectSubmenu(true)}
            onMouseLeave={() => setShowProjectSubmenu(false)}
          >
            <button
              ref={projectItemRef}
              className="pm-item"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                width: '100%',
                padding: '6px 9px',
                borderRadius: 'var(--r-sm)',
                border: 'none',
                background: showProjectSubmenu ? 'rgba(var(--acc-r),var(--acc-g),var(--acc-b),.09)' : 'transparent',
                cursor: 'pointer',
                fontFamily: 'var(--font)',
                fontSize: 12,
                color: 'var(--tx2)',
                textAlign: 'left',
                transition: 'background 0.1s, color 0.1s',
              }}
            >
              <span className="pm-icon" style={{
                width: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, color: 'var(--tx3)',
              }}>
                <Folder size={14} />
              </span>
              <span className="pm-label" style={{ flex: 1 }}>Add to project</span>
              <span className="pm-arrow" style={{ color: 'var(--tx4)', flexShrink: 0 }}>
                <ChevronRight size={10} />
              </span>
            </button>
            {renderProjectSubmenu()}
          </div>

        <Divider />

        <MenuItem icon={BookOpen} label="Skills" onClick={() => { onSkills(); setShowMenu(false) }} hasArrow />
        <MenuItem icon={Zap} label="Add connectors" onClick={() => { onAddConnectors(); setShowMenu(false) }} />

        <Divider />

        <MenuItem
          icon={Search}
          label="Web search"
          onClick={() => {
            if (!modelCanWebSearch && !langSearchApiKey && !webSearchEnabled) {
              setShowApiKeyModal(true)
            } else {
              onWebSearchToggle?.(!webSearchEnabled);
            }
          }}
          isToggle
          isActive={webSearchEnabled}
          info={!modelCanWebSearch && !langSearchApiKey ? 'Add Lang API Key First' : undefined}
        />
        <MenuItem
          icon={Brain}
          label="Memories"
          onClick={() => { onMemoryToggle?.(Boolean(!memoryEnabled)); }}
          isToggle
          isActive={Boolean(memoryEnabled)}
        />
        <MenuItem
          icon={Terminal}
          label="Operation"
          onClick={() => { onOperationToggle?.(!operationMode); }}
          isToggle
          isActive={Boolean(operationMode)}
        />
        {/* Wrapper div with no gap - submenu attaches directly to button edge */}
        <div
          style={{ position: 'relative' }}
          onMouseEnter={() => setShowStyleSubmenu(true)}
          onMouseLeave={() => setShowStyleSubmenu(false)}
        >
          <button
            ref={styleItemRef}
            className="pm-item"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              width: '100%',
              padding: '6px 9px',
              borderRadius: 'var(--r-sm)',
              border: 'none',
              background: showStyleSubmenu ? 'rgba(var(--acc-r),var(--acc-g),var(--acc-b),.09)' : 'transparent',
              cursor: 'pointer',
              fontFamily: 'var(--font)',
              fontSize: 12,
              color: 'var(--tx2)',
              textAlign: 'left',
              transition: 'background 0.1s, color 0.1s',
            }}
          >
            <span className="pm-icon" style={{
              width: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, color: 'var(--tx3)',
            }}>
              <Pen size={14} />
            </span>
            <span className="pm-label" style={{ flex: 1 }}>Use style</span>
            <span className="pm-arrow" style={{ color: 'var(--tx4)', flexShrink: 0 }}>
              <ChevronRight size={10} />
            </span>
          </button>
          {/* Submenu rendered inline so hover between button and submenu works - no gap */}
          {renderStyleSubmenu()}
        </div>
      </div>
    )

    // Use portal to render at document body level, bypassing any parent transforms
    return createPortal(dropdown, document.body)
  }

  // Render API key modal
  const renderApiKeyModal = () => {
    if (!showApiKeyModal) return null

    return createPortal(
      <div
        className="modal-overlay"
        onClick={() => setShowApiKeyModal(false)}
      >
        <div
          style={{
            background: 'var(--sf)',
            border: '1px solid var(--bd2)',
            borderRadius: 'var(--r)',
            padding: 24,
            minWidth: 340,
            maxWidth: 400,
            boxShadow: '0 12px 48px rgba(0,0,0,.2)',
            animation: 'dropDown 0.15s ease',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--tx)', marginBottom: 8 }}>
            Add LangSearch API Key
          </div>
          <div style={{ fontSize: 13, color: 'var(--tx2)', lineHeight: 1.6, marginBottom: 20 }}>
            This model doesn't support web search natively. Add a LangSearch API key to enable web search via their free API.
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button
              className="btn btn-sm"
              onClick={() => setShowApiKeyModal(false)}
              style={{ background: 'transparent', border: '1px solid var(--bd)', color: 'var(--tx2)' }}
            >
              Cancel
            </button>
            <button
              className="btn btn-sm"
              style={{ background: 'rgba(var(--acc-r),var(--acc-g),var(--acc-b),1)', color: '#fff', border: 'none' }}
              onClick={() => {
                setShowApiKeyModal(false)
                setShowMenu(false)
                btnRef.current?.classList.remove('open')
                onNavigateToConnections?.()
              }}
            >
              Continue to Settings
            </button>
          </div>
        </div>
      </div>,
      document.body
    )
  }

  const showStyleIndicator = currentStyle !== 'normal'

  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 6 }}>
      <button
        ref={btnRef}
        className="t-btn plus-btn"
        title="Add"
        onClick={toggleMenu}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 6v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3"/></svg>
      </button>
      
      {/* Style indicator button - appears when style is not normal, to the right of + */}
      {showStyleIndicator && (
        <button
          ref={styleIndicatorRef}
          className="t-btn"
          title={isStyleBtnHovered ? `${currentStyle.charAt(0).toUpperCase() + currentStyle.slice(1)} — click to reset` : `Style: ${currentStyle}`}
          onMouseEnter={() => setIsStyleBtnHovered(true)}
          onMouseLeave={() => setIsStyleBtnHovered(false)}
          onClick={handleStyleReset}
          style={{
            width: 28,
            height: 28,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 'var(--r-sm)',
            border: 'none',
            background: isStyleBtnHovered 
              ? 'rgba(var(--acc-r),var(--acc-g),var(--acc-b),.15)' 
              : 'rgba(var(--acc-r),var(--acc-g),var(--acc-b),.09)',
            cursor: 'pointer',
            color: isStyleBtnHovered 
              ? 'var(--tx)' 
              : 'rgba(var(--acc-r),var(--acc-g),var(--acc-b),1)',
            transition: 'background 0.15s, color 0.15s',
          }}
        >
          {isStyleBtnHovered ? <X size={14} /> : <Pen size={14} />}
        </button>
      )}
      {renderDropdown()}
      {renderApiKeyModal()}
    </div>
  )
}
