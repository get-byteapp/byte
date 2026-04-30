import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import {
  Plus,
  Search,
  Folder,
  FolderOpen,
  Archive,
  MoreHorizontal,
  Edit2,
  Trash2,
  X,
  ArchiveRestore,
  Check,
  Palette,
  Code,
  Pencil,
  Lightbulb,
  Globe,
  BarChart3,
  Calendar,
  Sparkles,
  AlignLeft,
  Type,
  MessageSquare,
  Target,
  Zap,
  BookOpen,
  FileText,
  PenTool,
  Command,
  Cpu,
  Database,
  Layers,
  Mail,
  Map,
  Music,
  Image,
  Video,
  Mic,
  Calculator,
  Clock,
  Compass,
  Flag,
  Heart,
  Star,
  Sun,
  Moon,
  Briefcase,
  Building2,
  GraduationCap,
  FlaskConical,
  ShoppingBag,
  Wallet,
  Plane,
  Car,
  Home,
  Smartphone,
  Monitor,
  Printer,
  Camera,
  Gift,
  Trophy,
  Award,
  Shield,
  Lock,
  Key,
  Rocket,
  Hammer,
  Wrench,
  Scissors,
  Paintbrush,
  Brush,
  Ruler,
  Clipboard,
  StickyNote,
  Bookmark,
  Tag,
  Hash,
  AtSign,
  Link,
  Paperclip,
  Upload,
  Download,
  Cloud,
  Umbrella,
  Thermometer,
  Battery,
  Plug,
  ZapOff,
  Flame,
  Droplets,
  Leaf,
  TreePine,
  Flower2,
  Mountain,
  Waves,
  Fish,
  Bird,
  Cat,
  Dog,
  Rabbit,
  Bug,
  Snail,
  Turtle,
  BugOff,
  type LucideIcon,
} from 'lucide-react'
import { useStore } from '../../store/useStore'
import type { Project } from '../../types'

const PROJECT_ICONS: { name: string; icon: LucideIcon }[] = [
  { name: 'Folder', icon: Folder },
  { name: 'Briefcase', icon: Briefcase },
  { name: 'Building2', icon: Building2 },
  { name: 'GraduationCap', icon: GraduationCap },
  { name: 'FlaskConical', icon: FlaskConical },
  { name: 'ShoppingBag', icon: ShoppingBag },
  { name: 'Wallet', icon: Wallet },
  { name: 'Plane', icon: Plane },
  { name: 'Car', icon: Car },
  { name: 'Home', icon: Home },
  { name: 'Code', icon: Code },
  { name: 'Pencil', icon: Pencil },
  { name: 'Lightbulb', icon: Lightbulb },
  { name: 'Globe', icon: Globe },
  { name: 'BarChart3', icon: BarChart3 },
  { name: 'Calendar', icon: Calendar },
  { name: 'Sparkles', icon: Sparkles },
  { name: 'AlignLeft', icon: AlignLeft },
  { name: 'Type', icon: Type },
  { name: 'MessageSquare', icon: MessageSquare },
  { name: 'Target', icon: Target },
  { name: 'Zap', icon: Zap },
  { name: 'BookOpen', icon: BookOpen },
  { name: 'FileText', icon: FileText },
  { name: 'PenTool', icon: PenTool },
  { name: 'Command', icon: Command },
  { name: 'Cpu', icon: Cpu },
  { name: 'Database', icon: Database },
  { name: 'Layers', icon: Layers },
  { name: 'Mail', icon: Mail },
  { name: 'Map', icon: Map },
  { name: 'Music', icon: Music },
  { name: 'Image', icon: Image },
  { name: 'Video', icon: Video },
  { name: 'Mic', icon: Mic },
  { name: 'Calculator', icon: Calculator },
  { name: 'Clock', icon: Clock },
  { name: 'Compass', icon: Compass },
  { name: 'Flag', icon: Flag },
  { name: 'Heart', icon: Heart },
  { name: 'Star', icon: Star },
  { name: 'Sun', icon: Sun },
  { name: 'Moon', icon: Moon },
  { name: 'Smartphone', icon: Smartphone },
  { name: 'Monitor', icon: Monitor },
  { name: 'Printer', icon: Printer },
  { name: 'Camera', icon: Camera },
  { name: 'Gift', icon: Gift },
  { name: 'Trophy', icon: Trophy },
  { name: 'Award', icon: Award },
  { name: 'Shield', icon: Shield },
  { name: 'Lock', icon: Lock },
  { name: 'Key', icon: Key },
  { name: 'Rocket', icon: Rocket },
  { name: 'Hammer', icon: Hammer },
  { name: 'Wrench', icon: Wrench },
  { name: 'Scissors', icon: Scissors },
  { name: 'Paintbrush', icon: Paintbrush },
  { name: 'Brush', icon: Brush },
  { name: 'Ruler', icon: Ruler },
  { name: 'Clipboard', icon: Clipboard },
  { name: 'StickyNote', icon: StickyNote },
  { name: 'Bookmark', icon: Bookmark },
  { name: 'Tag', icon: Tag },
  { name: 'Hash', icon: Hash },
  { name: 'AtSign', icon: AtSign },
  { name: 'Link', icon: Link },
  { name: 'Paperclip', icon: Paperclip },
  { name: 'Upload', icon: Upload },
  { name: 'Download', icon: Download },
  { name: 'Cloud', icon: Cloud },
  { name: 'Umbrella', icon: Umbrella },
  { name: 'Thermometer', icon: Thermometer },
  { name: 'Battery', icon: Battery },
  { name: 'Plug', icon: Plug },
  { name: 'ZapOff', icon: ZapOff },
  { name: 'Flame', icon: Flame },
  { name: 'Droplets', icon: Droplets },
  { name: 'Leaf', icon: Leaf },
  { name: 'TreePine', icon: TreePine },
  { name: 'Flower2', icon: Flower2 },
  { name: 'Mountain', icon: Mountain },
  { name: 'Waves', icon: Waves },
  { name: 'Fish', icon: Fish },
  { name: 'Bird', icon: Bird },
  { name: 'Cat', icon: Cat },
  { name: 'Dog', icon: Dog },
  { name: 'Rabbit', icon: Rabbit },
  { name: 'Bug', icon: Bug },
  { name: 'Snail', icon: Snail },
  { name: 'Turtle', icon: Turtle },
  { name: 'BugOff', icon: BugOff },
]

const PROJECT_COLORS = [
  { name: 'Slate', value: '#64748b', bg: 'rgba(100,116,139,0.1)' },
  { name: 'Red', value: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
  { name: 'Orange', value: '#f97316', bg: 'rgba(249,115,22,0.1)' },
  { name: 'Amber', value: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
  { name: 'Green', value: '#22c55e', bg: 'rgba(34,197,94,0.1)' },
  { name: 'Emerald', value: '#10b981', bg: 'rgba(16,185,129,0.1)' },
  { name: 'Teal', value: '#14b8a6', bg: 'rgba(20,184,166,0.1)' },
  { name: 'Cyan', value: '#06b6d4', bg: 'rgba(6,182,212,0.1)' },
  { name: 'Sky', value: '#0ea5e9', bg: 'rgba(14,165,233,0.1)' },
  { name: 'Blue', value: '#3b82f6', bg: 'rgba(59,130,246,0.1)' },
  { name: 'Indigo', value: '#6366f1', bg: 'rgba(99,102,241,0.1)' },
  { name: 'Violet', value: '#8b5cf6', bg: 'rgba(139,92,246,0.1)' },
  { name: 'Purple', value: '#a855f7', bg: 'rgba(168,85,247,0.1)' },
  { name: 'Fuchsia', value: '#d946ef', bg: 'rgba(217,70,239,0.1)' },
  { name: 'Pink', value: '#ec4899', bg: 'rgba(236,72,153,0.1)' },
  { name: 'Rose', value: '#f43f5e', bg: 'rgba(244,63,94,0.1)' },
]

// Icon map for dynamic lookup
const ICON_MAP: Record<string, LucideIcon> = {}
PROJECT_ICONS.forEach(({ name, icon }) => {
  ICON_MAP[name] = icon
})

interface ProjectModalProps {
  project?: Project | null
  isOpen: boolean
  onClose: () => void
  onSave: (data: { name: string; description: string; color: string; icon: string }) => void
}

function ProjectModal({ project, isOpen, onClose, onSave }: ProjectModalProps) {
  const [name, setName] = useState(project?.name || '')
  const [description, setDescription] = useState(project?.description || '')
  const [color, setColor] = useState(project?.color || PROJECT_COLORS[9].value)
  const [icon, setIcon] = useState(project?.icon || 'Folder')
  const [isCustomColor, setIsCustomColor] = useState(false)
  const [customColor, setCustomColor] = useState(project?.color || '#3b82f6')
  const [showIconPicker, setShowIconPicker] = useState(false)

  // Check if current color is custom (not in preset list)
  useState(() => {
    const isPreset = PROJECT_COLORS.some(c => c.value === (project?.color || '#3b82f6'))
    if (!isPreset && project?.color) {
      setIsCustomColor(true)
      setCustomColor(project.color)
    }
  })

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    const finalColor = isCustomColor ? customColor : color
    onSave({ name: name.trim(), description: description.trim(), color: finalColor, icon })
    onClose()
  }

  const isEditing = !!project

  const handleColorSelect = (colorValue: string) => {
    setColor(colorValue)
    setIsCustomColor(false)
  }

  const SelectedIcon = ICON_MAP[icon] || Folder

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{isEditing ? 'Edit Project' : 'New Project'}</h3>
          <button className="modal-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Icon Selector */}
          <div className="form-group">
            <label>Icon</label>
            <div className="proj-icon-selector">
              <button
                type="button"
                className="proj-icon-preview"
                onClick={() => setShowIconPicker(!showIconPicker)}
                style={{ backgroundColor: isCustomColor ? customColor : color }}
              >
                <SelectedIcon size={24} color="white" />
              </button>
              <span className="proj-icon-name">{icon}</span>
            </div>
            
            {showIconPicker && (
              <div className="proj-icon-picker">
                <div className="proj-icon-grid">
                  {PROJECT_ICONS.map(({ name, icon: IconComponent }) => (
                    <button
                      key={name}
                      type="button"
                      className={`proj-icon-option ${icon === name ? 'selected' : ''}`}
                      onClick={() => {
                        setIcon(name)
                        setShowIconPicker(false)
                      }}
                      title={name}
                    >
                      <IconComponent size={20} />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="form-group">
            <label>Name</label>
            <input
              type="text"
              className="modal-input"
              placeholder="Project name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>

          <div className="form-group">
            <label>Description</label>
            <textarea
              className="modal-textarea"
              placeholder="What is this project about?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Color</label>
            <div className="proj-color-section">
              {/* Preset Colors */}
              <div className="proj-color-grid">
                {PROJECT_COLORS.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    className={`proj-color-option ${!isCustomColor && color === c.value ? 'selected' : ''}`}
                    style={{ backgroundColor: c.value }}
                    onClick={() => handleColorSelect(c.value)}
                    title={c.name}
                  >
                    {!isCustomColor && color === c.value && <Check size={14} color="white" />}
                  </button>
                ))}
              </div>
              
              {/* Custom Color Option */}
              <div className="proj-custom-color">
                <button
                  type="button"
                  className={`proj-custom-color-btn ${isCustomColor ? 'active' : ''}`}
                  onClick={() => setIsCustomColor(!isCustomColor)}
                >
                  <Palette size={16} />
                  <span>Custom</span>
                </button>
                
                {isCustomColor && (
                  <div className="proj-custom-color-input">
                    <input
                      type="color"
                      value={customColor}
                      onChange={(e) => setCustomColor(e.target.value)}
                      className="proj-color-input"
                    />
                    <input
                      type="text"
                      value={customColor}
                      onChange={(e) => setCustomColor(e.target.value)}
                      className="proj-hex-input"
                      placeholder="#3b82f6"
                      maxLength={7}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" className="modal-btn secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="modal-btn primary" disabled={!name.trim()}>
              {isEditing ? 'Save Changes' : 'Create Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

interface ConfirmModalProps {
  isOpen: boolean
  title: string
  message: string
  onConfirm: () => void
  onCancel: () => void
  confirmText?: string
  isDestructive?: boolean
}

function ConfirmModal({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = 'Confirm',
  isDestructive = false,
}: ConfirmModalProps) {
  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal modal-sm" onClick={(e) => e.stopPropagation()}>
        <h3>{title}</h3>
        <p style={{ color: 'var(--tx2)', fontSize: '14px', marginTop: '8px', lineHeight: 1.5 }}>
          {message}
        </p>
        <div className="modal-actions" style={{ marginTop: '24px' }}>
          <button type="button" className="modal-btn secondary" onClick={onCancel}>
            Cancel
          </button>
          <button
            type="button"
            className={`modal-btn ${isDestructive ? 'danger' : 'primary'}`}
            onClick={onConfirm}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}

export function ProjectsView() {
  const {
    projects,
    chats,
    addProject,
    updateProject,
    removeProject,
    archiveProject,
    unarchiveProject,
  } = useStore()

  const [selectMode, setSelectMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState('')
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const formatDate = (timestamp: number) => {
    const now = Date.now()
    const diff = now - timestamp
    const dayMs = 24 * 60 * 60 * 1000
    if (diff < dayMs) {
      return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    } else if (diff < 2 * dayMs) {
      return 'Yesterday'
    } else if (diff < 7 * dayMs) {
      return new Date(timestamp).toLocaleDateString([], { weekday: 'short' })
    } else {
      return new Date(timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' })
    }
  }

  const filteredProjects = useMemo(() => {
    if (!searchQuery) return projects
    const q = searchQuery.toLowerCase()
    return projects.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q)
    )
  }, [projects, searchQuery])

  const activeProjects = useMemo(
    () => filteredProjects.filter((p) => p.status === 'active').sort((a, b) => b.updatedAt - a.updatedAt),
    [filteredProjects]
  )

  const archivedProjects = useMemo(
    () => filteredProjects.filter((p) => p.status === 'archived').sort((a, b) => b.updatedAt - a.updatedAt),
    [filteredProjects]
  )

  const handleProjectClick = (projectId: string) => {
    if (selectMode) {
      const newSet = new Set(selectedIds)
      if (newSet.has(projectId)) {
        newSet.delete(projectId)
      } else {
        newSet.add(projectId)
      }
      setSelectedIds(newSet)
    }
  }

  const toggleSelectMode = () => {
    setSelectMode(!selectMode)
    if (selectMode) setSelectedIds(new Set())
  }

  const selectAll = () => {
    setSelectedIds(new Set(filteredProjects.map((p) => p.id)))
  }

  const handleCreateProject = useCallback(
    (data: { name: string; description: string; color: string; icon: string }) => {
      addProject({
        ...data,
        status: 'active',
        chatIds: [],
      })
    },
    [addProject]
  )

  const handleUpdateProject = useCallback(
    (data: { name: string; description: string; color: string; icon: string }) => {
      if (editingProject) {
        updateProject(editingProject.id, data)
        setEditingProject(null)
      }
    },
    [editingProject, updateProject]
  )

  const handleDeleteProject = useCallback(
    (id: string) => {
      removeProject(id)
      setConfirmDelete(null)
    },
    [removeProject]
  )

  const getProjectChats = useCallback(
    (project: Project) => {
      return chats.filter((c) => project.chatIds.includes(c.id))
    },
    [chats]
  )

  const ProjectMenu = ({ project }: { project: Project }) => {
    const [isOpen, setIsOpen] = useState(false)
    const menuRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
      const handleClickOutside = (e: MouseEvent) => {
        if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
          setIsOpen(false)
        }
      }
      if (isOpen) {
        document.addEventListener('mousedown', handleClickOutside)
      }
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [isOpen])

    return (
      <div className="chat-menu" ref={menuRef}>
        <button
          className="chat-menu-btn"
          onClick={(e) => {
            e.stopPropagation()
            setIsOpen(!isOpen)
          }}
          title="More options"
        >
          <MoreHorizontal size={14} />
        </button>
        {isOpen && (
          <div className="chat-menu-dropdown">
            <button
              className="chat-menu-item"
              onClick={(e) => { e.stopPropagation(); setEditingProject(project); setIsOpen(false) }}
            >
              <Edit2 size={13} />
              <span>Edit</span>
            </button>
            <div className="chat-menu-divider" />
            {project.status === 'active' ? (
              <button
                className="chat-menu-item"
                onClick={(e) => { e.stopPropagation(); archiveProject(project.id); setIsOpen(false) }}
              >
                <Archive size={13} />
                <span>Archive</span>
              </button>
            ) : (
              <button
                className="chat-menu-item"
                onClick={(e) => { e.stopPropagation(); unarchiveProject(project.id); setIsOpen(false) }}
              >
                <ArchiveRestore size={13} />
                <span>Unarchive</span>
              </button>
            )}
            <div className="chat-menu-divider" />
            <button
              className="chat-menu-item chat-menu-item-danger"
              onClick={(e) => { e.stopPropagation(); setConfirmDelete(project.id); setIsOpen(false) }}
            >
              <Trash2 size={13} />
              <span>Delete</span>
            </button>
          </div>
        )}
      </div>
    )
  }

  // Get icon component for a project
  const getProjectIcon = (iconName: string) => {
    return ICON_MAP[iconName] || Folder
  }

  return (
    <div className="view on" style={{ flexDirection: 'column', height: '100%' }}>
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
          <div style={{ width: '100%', maxWidth: 760, margin: '0 auto', padding: '32px 24px 60px', display: 'flex', flexDirection: 'column', flex: 1 }}>
            
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div className="vi-h" style={{ marginBottom: 0 }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 22, height: 22, borderRadius: 6, background: 'var(--sf2)', border: '1px solid var(--bd)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: 'var(--tx2)' }}>
                    <Folder size={14} />
                  </span>
                  Projects
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button className={`btn btn-sm ${selectMode ? 'btn-active' : ''}`} onClick={toggleSelectMode}>
                  {selectMode ? 'Selecting' : 'Select'}
                </button>
                <button className="btn btn-sm" onClick={() => setIsCreateModalOpen(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <Plus size={11} />
                  New project
                </button>
              </div>
            </div>

            {/* Selection bar */}
            {selectMode && (
              <div className="selection-bar" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: 'rgba(var(--acc-r),var(--acc-g),var(--acc-b),.08)', border: '1px solid rgba(var(--acc-r),var(--acc-g),var(--acc-b),.2)', borderRadius: 'var(--r-sm)', marginBottom: 14 }}>
                <div style={{ flex: 1, fontSize: 'calc(var(--fs) - 1px)', color: 'var(--tx2)' }}>{selectedIds.size} selected</div>
                <button className="btn btn-sm" onClick={selectAll}>Select all</button>
                <button className="btn btn-sm" style={{ color: 'var(--danger-fill)', borderColor: 'var(--danger-border)', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                  <Trash2 size={11} />
                  Delete
                </button>
                <button className="btn btn-sm" onClick={toggleSelectMode}>Cancel</button>
              </div>
            )}

            {/* Search bar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--sf)', border: '1px solid var(--bd)', borderRadius: 'var(--r-lg)', padding: '10px 16px', marginBottom: 8 }}>
              <Search size={13} style={{ color: 'var(--tx3)' }} />
              <input 
                type="text" 
                placeholder="Search your projects…" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontSize: 'var(--fs)', color: 'var(--tx)', fontFamily: 'var(--font)' }}
              />
            </div>

            {/* Projects list */}
            <div className={selectMode ? 'select-mode' : ''}>
              {filteredProjects.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--tx4)' }}>
                  <div style={{ marginBottom: 12 }}>
                    <Folder size={32} />
                  </div>
                  No projects yet.<br />Create a project to organize your chats.
                </div>
              ) : (
                <>
                  {/* Active Projects */}
                  {activeProjects.length > 0 && (
                    <>
                      <div className="chats-section-header">
                        <span className="chats-section-label" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <FolderOpen size={9} />
                          Active
                        </span>
                        <span className="chats-section-info">{activeProjects.length} project{activeProjects.length !== 1 ? 's' : ''}</span>
                      </div>
                      {activeProjects.map((project) => {
                        const projectChats = getProjectChats(project)
                        const ProjectIcon = getProjectIcon(project.icon)

                        return (
                          <div
                            key={project.id}
                            className={`chat-list-item ${selectedIds.has(project.id) ? 'selected' : ''}`}
                            onClick={() => handleProjectClick(project.id)}
                          >
                            <div className="chat-cb" onClick={(e) => { e.stopPropagation(); handleProjectClick(project.id) }}>
                              {selectedIds.has(project.id) && (
                                <Check size={10} />
                              )}
                            </div>
                            <div className="cli-content" style={{ flex: 1, minWidth: 0 }}>
                              <div className="cli-title">
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                  <span 
                                    style={{ 
                                      width: 32, 
                                      height: 32, 
                                      borderRadius: 7, 
                                      backgroundColor: project.color,
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      flexShrink: 0,
                                      boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                                    }}
                                  >
                                    <ProjectIcon size={18} color="white" strokeWidth={2.5} />
                                  </span>
                                  <span>{project.name}</span>
                                </div>
                              </div>
                              <div className="cli-meta">
                                {project.description || 'No description'}
                                <span style={{ margin: '0 6px', color: 'var(--bd2)' }}>•</span>
                                {projectChats.length} chat{projectChats.length !== 1 ? 's' : ''}
                                <span style={{ margin: '0 6px', color: 'var(--bd2)' }}>•</span>
                                {formatDate(project.updatedAt)}
                              </div>
                            </div>
                            <ProjectMenu project={project} />
                          </div>
                        )
                      })}
                    </>
                  )}

                  {/* Archived Projects */}
                  {archivedProjects.length > 0 && (
                    <>
                      <div className="chats-section-header">
                        <span className="chats-section-label" style={{ color: 'var(--tx3)', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Archive size={9} />
                          Archived
                        </span>
                        <span className="chats-section-info">Hidden from active view</span>
                      </div>
                      {archivedProjects.map((project) => {
                        const projectChats = getProjectChats(project)
                        const ProjectIcon = getProjectIcon(project.icon)

                        return (
                          <div
                            key={project.id}
                            className={`chat-list-item ${selectedIds.has(project.id) ? 'selected' : ''}`}
                            style={{ opacity: 0.5 }}
                            onClick={() => handleProjectClick(project.id)}
                          >
                            <div className="chat-cb" onClick={(e) => { e.stopPropagation(); handleProjectClick(project.id) }}>
                              {selectedIds.has(project.id) && (
                                <Check size={10} />
                              )}
                            </div>
                            <div className="cli-content" style={{ flex: 1, minWidth: 0 }}>
                              <div className="cli-title">
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                  <span 
                                    style={{ 
                                      width: 32, 
                                      height: 32, 
                                      borderRadius: 7, 
                                      backgroundColor: project.color,
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      flexShrink: 0,
                                      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                                      filter: 'grayscale(0.3)'
                                    }}
                                  >
                                    <ProjectIcon size={18} color="white" strokeWidth={2.5} />
                                  </span>
                                  <span>{project.name}</span>
                                </div>
                              </div>
                              <div className="cli-meta">
                                {project.description || 'No description'}
                                <span style={{ margin: '0 6px', color: 'var(--bd2)' }}>•</span>
                                {projectChats.length} chat{projectChats.length !== 1 ? 's' : ''}
                                <span style={{ margin: '0 6px', color: 'var(--bd2)' }}>•</span>
                                {formatDate(project.updatedAt)}
                              </div>
                            </div>
                            <ProjectMenu project={project} />
                          </div>
                        )
                      })}
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <ProjectModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSave={handleCreateProject}
      />

      <ProjectModal
        project={editingProject}
        isOpen={!!editingProject}
        onClose={() => setEditingProject(null)}
        onSave={handleUpdateProject}
      />

      <ConfirmModal
        isOpen={!!confirmDelete}
        title="Delete Project"
        message="Are you sure you want to delete this project? This action cannot be undone. Associated chats will not be deleted."
        onConfirm={() => confirmDelete && handleDeleteProject(confirmDelete)}
        onCancel={() => setConfirmDelete(null)}
        confirmText="Delete"
        isDestructive
      />
    </div>
  )
}
