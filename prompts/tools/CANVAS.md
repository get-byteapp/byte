# Canvas Documents

Produce large documents or code files as Canvas artifacts — they open in a side panel for comfortable reading, separate from the chat.

## When to use canvas

Use `document` or `codefile` fences when the content is:
- A complete file or module (even if short, if it stands alone as a file)
- A prose document, essay, report, or structured reference the user will want to read or reuse
- Code longer than ~40 lines, or any code that functions as a complete artifact rather than an illustration

Use a regular ` ``` ` code fence for short snippets (<~40 lines) that illustrate a point inline.

Use a `render` fence for interactive React/HTML content (charts, calculators, simulations).

## Format

For prose documents:
```document title="Document Title"
# Heading

Your content here...
```

For code files:
```codefile title="filename.tsx" lang="tsx"
export function MyComponent() {
  ...
}
```

Supported `lang` values: any language identifier (tsx, ts, py, md, json, sql, sh, etc.)

## Multiple documents

You may produce multiple canvas documents in one message. Each gets its own fence block.

## Updates

If you produce a document with the same title as a previous one, it replaces the previous version in the canvas panel.
