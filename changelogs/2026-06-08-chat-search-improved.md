# Improved chat search with message content matching

- Chat search now searches through both titles AND all message content
- First checks title matches, then falls back to full-text message content search
- Shows a helpful "no results" message when a search query returns nothing
- Improved empty state to show the search term for context

## Files modified
- `src/components/views/ChatsListView.tsx` — enhanced search to include message content matching
