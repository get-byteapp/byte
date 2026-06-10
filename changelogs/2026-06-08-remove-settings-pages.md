# Removed Storage, Database, and Connections pages from Settings

- Removed Storage, Database, and Connections tabs from the Settings sidebar navigation
- Removed the rendering sections for these panels
- Redirected the "Add API Key" flow from "connections" to "models" settings

## Files modified
- `src/components/views/SettingsView.tsx` — removed nav buttons and rendering for storage/database/connections
- `src/components/shared/InputBox.tsx` — redirected connections navigation to models
