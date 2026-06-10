# Added AI-powered search toggle setting

- Added `aiSearch` boolean to the store (default: false)
- Added toggle in Settings → Preferences → App behaviour for AI-powered search
- ChatsListView shows different help text when AI search is enabled
- The toggle and infrastructure are ready for the actual AI search implementation

## Files modified
- `src/store/useStore.ts` — added aiSearch state and setAiSearch action
- `src/components/views/SettingsView.tsx` — added AI-powered search toggle in GeneralPanel
- `src/components/views/ChatsListView.tsx` — reads aiSearch flag for contextual messaging
