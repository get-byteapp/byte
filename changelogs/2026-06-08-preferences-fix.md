# Made Preferences settings actually functional

- Added `userName`, `autoSave`, `telemetry`, and `hardwareAcceleration` to the Zustand store
- Name input now saves/loads from the store (persists across sessions)
- Auto-save, Telemetry, and Hardware acceleration toggles now work via the store
- All local state replaced with persisted store values

## Files modified
- `src/store/useStore.ts` — added userName, autoSave, telemetry, hardwareAcceleration + setters
- `src/components/views/SettingsView.tsx` — GeneralPanel uses store values instead of local state
