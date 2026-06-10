# change_chat_name

Use this tool when the conversation topic shifts or the user asks to rename the chat.

The name should be a concise 2-5 word summary of what the chat is about.

## Usage

\```tool_call
{ "tool": "change_chat_name", "name": "Concise title here" }
\```

## When to use

- The user starts discussing a new topic
- The user asks "what's this chat called?" or similar
- The current title no longer matches the conversation

## Example

If the user shares that they're a working man dealing with cancer, rename:
\```tool_call
{ "tool": "change_chat_name", "name": "Working man with cancer" }
\```
