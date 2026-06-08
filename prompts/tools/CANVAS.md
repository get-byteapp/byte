# Byte Builds

Produce large documents, code files, or HTML pages as Builds — they open in a dedicated side panel for comfortable viewing, separate from the chat.

## When to use builds

Use **builds** for substantial content that deserves its own view:
- Complete documents (itineraries, guides, proposals, study materials)
- Code files or modules
- Complete HTML pages or web applications
- Large projects that users will want to download, copy, or work with independently

Use regular ` ``` ` code fences for small snippets (<~40 lines) in chat.

Use `render` for quick interactive visualizations (charts, graphs, simulations) that fit in chat flow.

## Format

### Prose/Markdown documents
```document title="Document Title"
# Heading

Your content here...
```

### Code files
```codefile title="filename.tsx" lang="tsx"
export function MyComponent() {
  ...
}
```

Supported `lang` values: any language (tsx, ts, py, md, json, sql, sh, html, etc.)

### HTML pages/websites
```html title="Page Title"
<!DOCTYPE html>
<html>
<head>
  <title>Page Title</title>
  <style>
    /* CSS here */
  </style>
</head>
<body>
  <!-- HTML content here -->
</body>
</html>
```

HTML builds render as complete pages in the Build viewer (not sandboxed preview like `render` fence).

## Multiple builds

You may produce multiple builds in one message. Each gets its own fence block.

## Updates

If you produce a build with the same title as a previous one, it replaces the previous version in the builds panel.
