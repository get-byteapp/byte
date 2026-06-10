# Redesigned Sidebar settings page with proper icons and drag reorder

- Replaced emoji icons with proper lucide-react icons (MessageCircle, Folder, Zap, Users, Palette)
- Used the app's existing `cp-list` / `cp-item` / `cp-item-main` layout pattern for consistency
- Fixed drag-and-drop reorder to use the same pattern as quick prompts (GripVertical handle, proper drag events)
- Added GripVertical, MessageCircle, Users, Palette to imports

## Files modified
- `src/components/views/SettingsView.tsx` — rewrote SidebarPanel with proper icons and drag reorder
