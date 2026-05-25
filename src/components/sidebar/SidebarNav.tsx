import { MessageSquare, Folder, Clock, Zap, Users, Palette } from 'lucide-react'
import { useStore } from '../../store/useStore'
import type { ActiveView } from '../../types'

const navItems: { id: ActiveView; label: string; icon: React.ReactNode }[] = [
  { id: 'chats', label: 'Chats', icon: <MessageSquare size={18} /> },
  { id: 'projects', label: 'Projects', icon: <Folder size={18} /> },
  { id: 'council', label: 'Council', icon: <Clock size={18} /> },
  { id: 'sparks', label: 'Sparks', icon: <Zap size={18} /> },
  { id: 'agents', label: 'Agents', icon: <Users size={18} /> },
  { id: 'customize', label: 'Customize', icon: <Palette size={18} /> },
]

export function SidebarNav() {
  const { activeView, setActiveView } = useStore()

  return (
    <nav className="sb-nav">
      {navItems.map((item) => (
        <button
          key={item.id}
          className={`sb-item${activeView === item.id ? ' on' : ''}`}
          onClick={() => setActiveView(item.id)}
        >
          <span className="sb-icon">{item.icon}</span>
          <span className="sb-text">{item.label}</span>
        </button>
      ))}
    </nav>
  )
}