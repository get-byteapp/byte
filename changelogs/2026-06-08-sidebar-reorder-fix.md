# Fixed Chats icon and replaced drag with click-based reorder

- Changed Chats icon from MessageCircle to MessageSquare in SidebarPanel (settings)
- Replaced unreliable native HTML5 drag-and-drop with click-based up/down arrow buttons
- Added `cp-btn-arrow` CSS for the reorder buttons
- Removed unused GripVertical import

## Files modified
- `src/components/views/SettingsView.tsx` — fixed icon, replaced drag with arrow reorder
- `src/styles/components/chat.css` — added cp-btn-arrow styles
