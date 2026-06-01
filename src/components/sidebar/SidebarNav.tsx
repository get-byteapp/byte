import { MessageSquare, Folder, Zap, Users, Palette } from 'lucide-react'
import { useStore } from '../../store/useStore'
import type { ActiveView } from '../../types'

const navItems: { id: ActiveView; label: string; icon: React.ReactNode }[] = [
  { id: 'chats', label: 'Chats', icon: <MessageSquare size={18} /> },
  { id: 'projects', label: 'Projects', icon: <Folder size={18} /> },
  { id: 'council', label: 'Council', icon: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 21h10"/><rect width="20" height="14" x="2" y="3" rx="2"/></svg> },
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