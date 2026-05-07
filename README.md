# Copy Markdown as Rich Text

A VSCode extension that converts selected markdown text to rich text and copies it to the clipboard so it can be pasted as formatted text into applications like Google Docs, Word, etc.

> Sorry, this is a vibe-coded app. I just wanted the feature 🤷‍♀️

## TODO
- code block:
  - use monospace font
- add context menu option to copy selection as Rich Text
- add shortcut

## Install

<!-- - [VSCode Marketplace](https://marketplace.visualstudio.com/items?itemName=SebastianSafari.copy-markdown-as-rich-text)
- [Open-VSX Marketplace](https://open-vsx.org/extension/SebastianSafari/copy-markdown-as-rich-text) -->


## Usage

1. Open a Markdown file (or any document with markdown content).
2. Optionally select a range — if nothing is selected the whole file is converted.
3. Run **Markdown: Copy as Rich Text** from the Command Palette (Ctrl+Shift+P).
4. Paste into your destination app (Google Docs, Word, Outlook, Slack, etc.).

## Settings

- `copyMarkdownRichText.includeStyles` — include inline CSS in the copied HTML (default: `true`).
- `copyMarkdownRichText.highlightCode` — syntax-highlight fenced code blocks (default: `true`).

## Platform notes

- **Windows / macOS**: works out of the box (uses built-in PowerShell / `osascript`).
- **Linux**: requires `wl-clipboard` on Wayland (`sudo apt install wl-clipboard`) or `xclip` on X11 (`sudo apt install xclip`). The extension picks one automatically based on `$WAYLAND_DISPLAY`. Without either, it falls back to copying the raw HTML as plain text and shows a warning.

## Building

## Local

- `npm install`
- `npm watch`
  - Then, hit F5 to debug.

### Publishing

- Confirm everything is working & compiles
- Update version in [package.json](./package.json) (e.g. "0.0.3")
- `vsce package`
- `export v='v0.0.4'; git add -A; git commit -m "$v release"; git push; git tag $v; git push origin $v;`
  - PS: `$v = "v0.0.4"; git add -A; git commit -m "$v release"; git push; git tag $v; git push origin $v`
- [Github Actions](./.github/workflows/main.yml) are configured to build & publish when a new tag is created, so on sucess it will auto publish
  - These use auth token repo secrets to push to both extension galleries.

## LICENSE

[Apache v2](https://raw.githubusercontent.com/ssebs/copy-markdown-as-rich-text/main/LICENSE)
