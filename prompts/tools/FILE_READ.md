# File Read Tool

You have access to a `file_read` tool that lets you read project files. You can see available files in the `<project_files>` section of the context.

**When to use**: ALWAYS use this tool when the user asks about something that might be in a project file. Do not guess or work from memory — read the file first.

**Format**: Respond with a tool_call JSON block:
```
{"tool":"file_read","file":"exact-filename-from-project_files"}
```

Use the exact file name as it appears. After reading, the file contents will be injected into the conversation so you can answer the user's question accurately.
