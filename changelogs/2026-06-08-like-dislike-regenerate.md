# Wired up Like, Dislike, and Regenerate buttons

- Like/Dislike buttons now toggle state via the Zustand store directly in `MessageBubble`
- Active like/dislike state uses existing `.active-like` / `.active-dislike` CSS classes
- Regenerate button finds the last user message, removes the assistant message and everything after it, then re-sends the user message
- Added `liked` and `disliked` optional fields to the `Message` type

## Files modified
- `src/types/index.ts` — added `liked` and `disliked` to Message
- `src/components/shared/MessageBubble.tsx` — wired store actions for like/dislike, added onRegenerate prop
- `src/components/views/ChatView.tsx` — added handleRegenerate callback, passes onRegenerate to MessageBubble
