import { useState, useRef, useEffect } from 'react'
import { MoreHorizontal, Star, Pencil, Trash2 } from 'lucide-react'

interface ChatMenuProps {
  onStar: () => void
  onRename: () => void
  onDelete: () => void
  isSaved: boolean
}

export function ChatMenu({ onStar, onRename, onDelete, isSaved }: ChatMenuProps) {
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  return (
    <div className="chat-menu-wrap" ref={menuRef}>
      <button
        className="chat-menu-btn"
        onClick={(e) => { e.stopPropagation(); setOpen(!open) }}
        title="More options"
      >
        <MoreHorizontal size={14} />
      </button>
      {open && (
        <div className="chat-menu-dropdown">
          <button
            className="chat-menu-item"
            onClick={(e) => { e.stopPropagation(); onStar(); setOpen(false) }}
          >
            <Star size={13} />
            <span>{isSaved ? 'Unstar' : 'Star'}</span>
          </button>
          <button
            className="chat-menu-item"
            onClick={(e) => { e.stopPropagation(); onRename(); setOpen(false) }}
          >
            <Pencil size={13} />
            <span>Rename</span>
          </button>
          <div className="chat-menu-divider" />
          <button
            className="chat-menu-item chat-menu-item-danger"
            onClick={(e) => { e.stopPropagation(); onDelete(); setOpen(false) }}
          >
            <Trash2 size={13} />
            <span>Delete</span>
          </button>
        </div>
      )}
    </div>
  )
}
