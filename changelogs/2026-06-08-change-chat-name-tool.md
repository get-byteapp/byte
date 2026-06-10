# Added change_chat_name AI tool

- Added `CHANGE_CHAT_NAME` to the `ToolId` type
- Added `parseChangeChatNameTool` parser and `handleChangeChatName` handler in ChatView
- AI can now rename chats via `{"tool":"change_chat_name","name":"New Title"}` tool call
- Rename appears as a collapsible tool dropdown saying "Changed chat name to 'New Title'"
- Added tool instructions to MAIN.md and prompts/tools/CHANGE_CHAT_NAME.md

## Files modified
- `src/types/index.ts` — added CHANGE_CHAT_NAME to ToolId
- `src/components/views/ChatView.tsx` — added parser, handler, and tool chain integration
- `prompts/MAIN.md` — added change_chat_name to available tools with docs
- `prompts/tools/CHANGE_CHAT_NAME.md` — new tool prompt file
