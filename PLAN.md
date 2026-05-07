
Create a VSCode/VSCodium extension called "Copy Markdown as Rich Text" that converts selected markdown text to rich text and copies it to the clipboard so it can be pasted as formatted text into applications like Google Docs, Word, etc.

## Requirements

1. **Command**: Register a command "markdown.copyAsRichText" with the display name "Markdown: Copy as Rich Text" accessible via the Command Palette (Ctrl+Shift+P).
2. **Behavior**:

  - If text is selected in the active editor, convert that selected markdown to HTML and copy it to the clipboard as rich text (text/html MIME type).
  - If no text is selected, convert the entire document content.
  - Show an info message "Copied as rich text!" on success.
3. **Markdown Rendering**:

  - Use the `markdown-it` library to convert markdown to HTML.
  - Support standard markdown features: headings, bold, italic, strikethrough, links, images, code blocks (with syntax highlighting via `highlight.js`), blockquotes, ordered/unordered lists, tables, and horizontal rules.
  - Wrap the output in a basic HTML document with inline CSS for sensible default styling (e.g., font-family, code block background color, table borders).
4. **Clipboard - Rich Text (CRITICAL)**:

  - The clipboard must be written with the `text/html` MIME type so that pasting into rich text editors (Google Docs, Word, Outlook) produces formatted output — NOT raw HTML tags.
  - Since the VSCode clipboard API (`vscode.env.clipboard.writeText`) only supports plain text, use one of these approaches:

    - **Option A (preferred, cross-platform)**: Use a native Node.js child process to invoke a platform-specific clipboard command:

      - **Linux**: pipe HTML to `xclip -selection clipboard -t text/html`
      - **macOS**: use a bundled Swift helper or `osascript` to write `«class HTML»` to the clipboard
      - **Windows**: use PowerShell `Set-Clipboard -AsHtml` or write to the clipboard via `clip.exe` with CF_HTML format
    - **Option B**: Use the `electron` clipboard module if accessible (`require('electron').clipboard.write({ html: htmlString })`)
  - Detect the platform at runtime using `process.platform` and choose the appropriate method.
5. **Fallback**: If the native clipboard write fails (e.g., xclip not installed), fall back to copying raw HTML as plain text and show a warning message explaining that `xclip` (or equivalent) is needed for rich text support.
6. **Configuration** (optional settings in `contributes.configuration`):

  - `copyMarkdownRichText.includeStyles`: boolean (default: true) — whether to include inline CSS styling.
  - `copyMarkdownRichText.highlightCode`: boolean (default: true) — whether to syntax-highlight code blocks.
7. **Package/Manifest**:

  - `engines.vscode`: "^1.70.0"
  - `activationEvents`: `onCommand:markdown.copyAsRichText`
  - `categories`: ["Other"]
  - `keywords`: ["markdown", "rich text", "clipboard", "copy", "formatted"]
  - Keep dependencies minimal: `markdown-it`, `highlight.js`
8. **Project Structure**:
```
copy-markdown-rich-text/
├── package.json
├── src/
│   └── extension.ts
├── tsconfig.json
├── README.md
└── .vscodeignore
```
9. **Publishing**: Include instructions for packaging as a .vsix with `vsce package` so it can be sideloaded into VSCodium.

Generate the full source code for all files.

There's your prompt. The critical piece is **point #4** — the clipboard must be written with the `text/html` MIME type, which the standard VS Code clipboard API doesn't support. The prompt covers the platform-specific workarounds:

- **Linux**: `xclip -selection clipboard -t text/html`
- **macOS**: `osascript` or Electron's clipboard module
- **Windows**: PowerShell `Set-Clipboard -AsHtml`