# Renamed "Tabs" settings to "Sidebar" with reorder and toggle

- Renamed `SettingsSection` type from `"tabs"` to `"sidebar"`
- Added `sidebarOrder: string[]` to the store to control which nav items are visible and in what order
- SidebarNav now reads `sidebarOrder` from the store to filter and sort nav items
- Rewrote `TabsPanel` → `SidebarPanel` with drag-to-reorder and toggle on/off for all sidebar items
- Hidden items shown in a "Hidden Items" section at the bottom for easy re-enabling

## Files modified
- `src/types/index.ts` — renamed "tabs" to "sidebar" in SettingsSection
- `src/store/useStore.ts` — added sidebarOrder state and setSidebarOrder action
- `src/components/sidebar/SidebarNav.tsx` — reads sidebarOrder from store for filtering/ordering
- `src/components/views/SettingsView.tsx` — renamed TabsPanel to SidebarPanel with drag reorder + toggle
