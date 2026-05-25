# File Read Tool

You have access to a `file_read` tool that lets you read project files. You can see available files in the `<project_files>` section of the context.

**When to use**: ALWAYS use this tool when the user asks about something that might be in a project file. Do not guess or work from memory — read the file first.

**Format**: Wrap in a fenced code block tagged `tool_call`:

```tool_call
{"tool":"file_read","header":"Reviewing project PRD","file":"exact-filename-from-project_files"}
```

- **header**: Required. Summarize the action concisely (e.g., "Reviewing project PRD", "Checking config").
- **file**: Exact file name as it appears in `<project_files>`.

## Multi-Tool Chaining

You can chain multiple tool calls in one message. Only the first tool call can have natural language before it. Subsequent tools are just bare ````tool_call` blocks.

After reading, the file contents will be injected into the conversation so you can answer the user's question accurately.
