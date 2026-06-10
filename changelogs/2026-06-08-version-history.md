# Added version history for regenerated messages

- Added `versions` and `activeVersion` fields to the `Message` type to store previous responses
- Regenerate now saves the old content as a version before creating a new response
- Added `pendingVersionRef` in ChatView to carry version data from regenerate into the new stream
- Added version navigation arrows (left/right) between the message text and action buttons
- Version label shows "Latest" for current, "Version 1/2/3" for saved versions
- Arrow states are disabled at boundaries (no older/newer versions)

## Files modified
- `src/types/index.ts` — added `versions` and `activeVersion`
- `src/components/views/ChatView.tsx` — refactored regenerate to save versions, added pendingVersionRef
- `src/components/shared/MessageBubble.tsx` — added version-aware content display and navigation UI
- `src/styles/components/chat.css` — added version navigation styling
