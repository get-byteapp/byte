import { Plus } from 'lucide-react'
import { useStore } from '../../store/useStore'
import { ByteLogo } from '../shared/ByteLogo'

export function SidebarHeader() {
  const { setActiveView, setActiveProjectId } = useStore()

  const goHome = () => {
    setActiveProjectId(null)
    setActiveView('home')
  }

  const startNewChat = () => {
    setActiveProjectId(null)
    setActiveView('home')
  }

  return (
    <div className="sb-head">
      <div className="sb-brand" onClick={goHome}>
        <ByteLogo size={24} />
        <span className="sb-brand-name">Byte</span>
      </div>

      <button
        id="nav-newchat"
        onClick={startNewChat}
        className="sb-newchat"
        title="New chat"
      >
        <Plus size={14} />
      </button>
    </div>
  )
}