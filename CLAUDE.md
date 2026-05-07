# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Architecture

Three-module VSCode extension that converts Markdown → HTML → system clipboard with a `text/html` MIME type so pastes land as formatted rich text.

- **`src/extension.ts`** — registers the single command `markdown.copyAsRichText`. Reads the active selection (or whole document if empty), pulls config (`copyMarkdownRichText.includeStyles`, `copyMarkdownRichText.highlightCode`), calls `renderMarkdown`, then `writeHtmlToClipboard`. On native clipboard failure it falls back to `vscode.env.clipboard.writeText(html)` and warns the user.
- **`src/render.ts`** — pure `renderMarkdown(md, opts)` wrapping `markdown-it` + `highlight.js`. Returns a complete `<!DOCTYPE html>` document with optional inline `<style>` (layout/typography only, no fg/bg colors so the destination's theme wins).
- **`src/clipboard.ts`** — platform dispatch on `process.platform`. Each branch shells out via `child_process.spawn`:
  - **win32**: PowerShell `-Sta -EncodedCommand` (UTF-16LE base64) running a script that builds a **CF_HTML descriptor by hand** (`Version:0.9` / `StartHTML` / `EndHTML` / `StartFragment` / `EndFragment` with UTF-8 byte offsets), registers it under the `'HTML Format'` clipboard format, and pairs it with `UnicodeText` via `DataObject.SetDataObject`. **Do not** use `DataObject.SetData(DataFormats.Html, ...)` — it stores raw HTML without the descriptor and consumers reject it, falling back to plain text.
  - **darwin**: `osascript -e 'set the clipboard to {«class HTML»:«data HTML…», «class utf8»:«data utf8…»}'` with hex-encoded payloads.
  - **linux**: `wl-copy -t text/html` if `$WAYLAND_DISPLAY` is set, otherwise `xclip -selection clipboard -t text/html`. Each tool replaces the clipboard, so only HTML is set.

HTML/text payloads are passed to PowerShell via base64 (then `-EncodedCommand` for the script itself) to sidestep CLI quoting; on macOS via hex inside the AppleScript literal; on Linux via stdin.

## Bundling

Webpack (`webpack.config.js`) bundles `src/extension.ts` → `dist/extension.js` (CommonJS, target `node`, `vscode` external). `markdown-it` and `highlight.js` are inlined, so `.vscodeignore` excludes `node_modules/` from the `.vsix`.

## Working Style
- There is no test runner wired up; `package.json` references `vscode-test` but the `src/test/` directory is intentionally absent.
- Don't run `gh` or `git` commands
- Follow KEEP IT SIMPLE, STUPID design
- Follow clean coding principles
# IF ASKED TO "USE GOOD STANDARDS" OR "FOLLOW @Claude.md", USE THE FOLLOWING

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.
