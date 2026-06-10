# Fixed settings navigation from modals and prompts

- "Go to Settings" in VisionUnsupportedModal now navigates to Models settings section
- "Open Settings" in No Vision Warning modal already navigated to Models (verified)
- All settings-related buttons now correctly navigate to the relevant settings section

## Files modified
- `src/components/shared/InputBox.tsx` — VisionUnsupportedModal onGoToSettings now sets section to "models"
