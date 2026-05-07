# Copy Markdown as Rich Text — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a VSCode/VSCodium extension that converts the active selection (or full document) from Markdown to HTML and writes it to the system clipboard with a `text/html` MIME type so it pastes as formatted text into Google Docs, Word, Outlook, etc.

**Architecture:** Three small modules — `extension.ts` (command wiring), `render.ts` (markdown-it + highlight.js → styled HTML string), `clipboard.ts` (platform dispatch to a child process: `xclip` / `osascript` / PowerShell). No abstractions beyond what each platform needs. Fail loudly with a fallback to plain-text HTML when the native command is missing.

**Tech Stack:** TypeScript, VSCode Extension API (`^1.118.0`), `markdown-it`, `highlight.js`, Node `child_process`. Bundled with the existing webpack config. Tested via `vscode-test` (Mocha).

---

## File Structure

- **Create** `src/render.ts` — pure function `renderMarkdown(md: string, opts: RenderOptions): string` returns a full HTML document (with optional inline CSS + highlight.js classes).
- **Create** `src/clipboard.ts` — `writeHtmlToClipboard(html: string): Promise<void>` — picks the platform helper, throws on failure with a meaningful message.
- **Modify** `src/extension.ts` — register the `markdown.copyAsRichText` command, wire selection → render → clipboard, surface success/error toasts.
- **Modify** `package.json` — rename command, add `contributes.configuration`, declare runtime deps, add activation event.
- **Modify** `src/test/extension.test.ts` — add unit tests for `render.ts` and `clipboard.ts` (CF_HTML header + command-string composition).
- **Modify** `README.md` — usage, packaging (`vsce package`), and the xclip-on-Linux note.
- **Modify** `.vscodeignore` — keep `node_modules/markdown-it` and `node_modules/highlight.js` out of `.vsix` (they're bundled by webpack).

Webpack already bundles dependencies into `dist/extension.js`, so `markdown-it` and `highlight.js` go in `dependencies` (not `devDependencies`) but won't ship as separate folders.

---

## Task 1: Add runtime dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install deps**

```bash
npm install markdown-it highlight.js
npm install --save-dev @types/markdown-it
```

- [ ] **Step 2: Verify `package.json` has them under `dependencies`**

Expected diff:
```json
"dependencies": {
  "highlight.js": "^11.x",
  "markdown-it": "^14.x"
},
"devDependencies": {
  "@types/markdown-it": "^14.x",
  ...existing...
}
```

- [ ] **Step 3: Compile to confirm types resolve**

Run: `npm run compile`
Expected: webpack succeeds, no type errors.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add markdown-it and highlight.js"
```

---

## Task 2: Implement `render.ts`

**Files:**
- Create: `src/render.ts`
- Test: `src/test/render.test.ts`

- [ ] **Step 1: Write the failing test** — `src/test/render.test.ts`

```ts
import * as assert from 'assert';
import { renderMarkdown } from '../render';

suite('renderMarkdown', () => {
  test('renders headings and bold', () => {
    const html = renderMarkdown('# Hi\n\n**bold**', { includeStyles: false, highlightCode: false });
    assert.ok(html.includes('<h1>Hi</h1>'));
    assert.ok(html.includes('<strong>bold</strong>'));
  });

  test('wraps output in a full HTML document', () => {
    const html = renderMarkdown('hello', { includeStyles: true, highlightCode: false });
    assert.ok(html.startsWith('<!DOCTYPE html>'));
    assert.ok(html.includes('<style>'));
  });

  test('omits <style> when includeStyles is false', () => {
    const html = renderMarkdown('hello', { includeStyles: false, highlightCode: false });
    assert.ok(!html.includes('<style>'));
  });

  test('highlights fenced code when highlightCode is true', () => {
    const html = renderMarkdown('```js\nconst x = 1;\n```', { includeStyles: false, highlightCode: true });
    assert.ok(html.includes('hljs'));
  });

  test('renders tables', () => {
    const html = renderMarkdown('| a | b |\n|---|---|\n| 1 | 2 |', { includeStyles: false, highlightCode: false });
    assert.ok(html.includes('<table>'));
    assert.ok(html.includes('<td>1</td>'));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — module `../render` not found.

- [ ] **Step 3: Implement `src/render.ts`**

```ts
import MarkdownIt from 'markdown-it';
import hljs from 'highlight.js';

export interface RenderOptions {
  includeStyles: boolean;
  highlightCode: boolean;
}

const STYLES = `
  body { font-family: -apple-system, Segoe UI, Helvetica, Arial, sans-serif; line-height: 1.5; color: #24292f; }
  h1, h2, h3, h4 { margin-top: 1.2em; margin-bottom: 0.4em; }
  code { background: #f6f8fa; padding: 0.1em 0.3em; border-radius: 3px; font-family: Consolas, Monaco, monospace; }
  pre { background: #f6f8fa; padding: 12px; border-radius: 4px; overflow-x: auto; }
  pre code { background: transparent; padding: 0; }
  blockquote { border-left: 4px solid #d0d7de; margin: 0; padding: 0 1em; color: #57606a; }
  table { border-collapse: collapse; }
  th, td { border: 1px solid #d0d7de; padding: 6px 12px; }
  img { max-width: 100%; }
  hr { border: 0; border-top: 1px solid #d0d7de; }
`;

export function renderMarkdown(markdown: string, opts: RenderOptions): string {
  const md = new MarkdownIt({
    html: true,
    linkify: true,
    typographer: false,
    highlight: opts.highlightCode
      ? (code, lang) => {
          if (lang && hljs.getLanguage(lang)) {
            try {
              return `<pre><code class="hljs language-${lang}">${hljs.highlight(code, { language: lang, ignoreIllegals: true }).value}</code></pre>`;
            } catch { /* fall through */ }
          }
          return `<pre><code class="hljs">${md.utils.escapeHtml(code)}</code></pre>`;
        }
      : undefined,
  });
  md.enable(['strikethrough', 'table']);

  const body = md.render(markdown);
  const style = opts.includeStyles ? `<style>${STYLES}</style>` : '';
  return `<!DOCTYPE html><html><head><meta charset="utf-8">${style}</head><body>${body}</body></html>`;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: all 5 `renderMarkdown` tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/render.ts src/test/render.test.ts
git commit -m "feat: render markdown to styled HTML document"
```

---

## Task 3: Implement Windows clipboard writer (CF_HTML)

**Files:**
- Create: `src/clipboard.ts`
- Test: `src/test/clipboard.test.ts`

Windows clipboards expect HTML wrapped in a CF_HTML descriptor with byte offsets. .NET's `System.Windows.Forms.Clipboard.SetText(s, TextDataFormat.Html)` builds that header for us, so we shell out to PowerShell. We pass the HTML on stdin (base64-encoded) to avoid quoting hell.

- [ ] **Step 1: Write the failing test** — `src/test/clipboard.test.ts`

```ts
import * as assert from 'assert';
import { __test__ } from '../clipboard';

suite('clipboard internals', () => {
  test('buildPowerShellCommand wraps base64 + SetText', () => {
    const cmd = __test__.buildPowerShellCommand();
    assert.ok(cmd.includes('System.Windows.Forms'));
    assert.ok(cmd.includes('TextDataFormat]::Html'));
    assert.ok(cmd.includes('FromBase64String'));
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npm test`
Expected: FAIL — `../clipboard` not found.

- [ ] **Step 3: Implement `src/clipboard.ts`**

```ts
import { spawn } from 'child_process';

export async function writeHtmlToClipboard(html: string): Promise<void> {
  switch (process.platform) {
    case 'win32': return writeWindows(html);
    case 'darwin': return writeMac(html);
    case 'linux': return writeLinux(html);
    default: throw new Error(`Unsupported platform: ${process.platform}`);
  }
}

function writeWindows(html: string): Promise<void> {
  const b64 = Buffer.from(html, 'utf8').toString('base64');
  return run('powershell.exe', ['-NoProfile', '-Command', POWERSHELL_SCRIPT], `$input = '${b64}'\n`);
}

const POWERSHELL_SCRIPT = `
Add-Type -AssemblyName System.Windows.Forms
$b64 = [Console]::In.ReadToEnd().Trim()
$html = [System.Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($b64))
[System.Windows.Forms.Clipboard]::SetText($html, [System.Windows.Forms.TextDataFormat]::Html)
`.trim();

function buildPowerShellCommand(): string { return POWERSHELL_SCRIPT; }

function writeMac(html: string): Promise<void> {
  // osascript: hex-encode the HTML and set «class HTML» data on the clipboard.
  const hex = Buffer.from(html, 'utf8').toString('hex').toUpperCase();
  const script = `set the clipboard to «data HTML${hex}»`;
  return run('osascript', ['-e', script]);
}

function writeLinux(html: string): Promise<void> {
  return run('xclip', ['-selection', 'clipboard', '-t', 'text/html'], html);
}

function run(cmd: string, args: string[], stdin?: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { windowsHide: true });
    let stderr = '';
    child.stderr.on('data', d => { stderr += d.toString(); });
    child.on('error', err => reject(new Error(`Failed to run ${cmd}: ${err.message}`)));
    child.on('close', code => {
      if (code === 0) resolve();
      else reject(new Error(`${cmd} exited with code ${code}: ${stderr.trim()}`));
    });
    if (stdin !== undefined) child.stdin.end(stdin);
    else child.stdin.end();
  });
}

export const __test__ = { buildPowerShellCommand };
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: clipboard test PASSES. (No real clipboard write happens in this test.)

- [ ] **Step 5: Commit**

```bash
git add src/clipboard.ts src/test/clipboard.test.ts
git commit -m "feat: platform-specific HTML clipboard writers"
```

---

## Task 4: Wire the command in `extension.ts`

**Files:**
- Modify: `src/extension.ts` (replace existing scaffold)
- Modify: `package.json`

- [ ] **Step 1: Update `package.json`**

Replace the `contributes` block and add `activationEvents`:

```json
"activationEvents": ["onCommand:markdown.copyAsRichText"],
"contributes": {
  "commands": [
    {
      "command": "markdown.copyAsRichText",
      "title": "Markdown: Copy as Rich Text"
    }
  ],
  "configuration": {
    "title": "Copy Markdown as Rich Text",
    "properties": {
      "copyMarkdownRichText.includeStyles": {
        "type": "boolean",
        "default": true,
        "description": "Include inline CSS in the copied HTML."
      },
      "copyMarkdownRichText.highlightCode": {
        "type": "boolean",
        "default": true,
        "description": "Syntax-highlight fenced code blocks via highlight.js."
      }
    }
  }
},
"keywords": ["markdown", "rich text", "clipboard", "copy", "formatted"]
```

- [ ] **Step 2: Replace `src/extension.ts`**

```ts
import * as vscode from 'vscode';
import { renderMarkdown } from './render';
import { writeHtmlToClipboard } from './clipboard';

export function activate(context: vscode.ExtensionContext) {
  const disposable = vscode.commands.registerCommand('markdown.copyAsRichText', copyAsRichText);
  context.subscriptions.push(disposable);
}

export function deactivate() {}

async function copyAsRichText() {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showWarningMessage('No active editor.');
    return;
  }

  const selection = editor.selection;
  const markdown = selection.isEmpty
    ? editor.document.getText()
    : editor.document.getText(selection);

  const config = vscode.workspace.getConfiguration('copyMarkdownRichText');
  const html = renderMarkdown(markdown, {
    includeStyles: config.get<boolean>('includeStyles', true),
    highlightCode: config.get<boolean>('highlightCode', true),
  });

  try {
    await writeHtmlToClipboard(html);
    vscode.window.showInformationMessage('Copied as rich text!');
  } catch (err) {
    await vscode.env.clipboard.writeText(html);
    const hint = process.platform === 'linux'
      ? 'Install `xclip` for rich-text clipboard support.'
      : `Native clipboard write failed: ${(err as Error).message}`;
    vscode.window.showWarningMessage(`Copied as plain HTML instead. ${hint}`);
  }
}
```

- [ ] **Step 3: Compile**

Run: `npm run compile`
Expected: success.

- [ ] **Step 4: Manual smoke test**

In VSCode, press F5 to launch the Extension Development Host. Open a `.md` file, run `Markdown: Copy as Rich Text` from the Command Palette, paste into a rich-text app (Outlook, Google Docs in browser). Expected: formatted output, not raw HTML tags.

- [ ] **Step 5: Commit**

```bash
git add src/extension.ts package.json
git commit -m "feat: register markdown.copyAsRichText command"
```

---

## Task 5: Update README and packaging

**Files:**
- Modify: `README.md`
- Modify: `.vscodeignore` (verify only)

- [ ] **Step 1: Replace `README.md`** with usage + packaging instructions

```markdown
# Copy Markdown as Rich Text

Convert the current selection (or whole file) from Markdown to formatted rich text and copy it to the clipboard. Paste into Google Docs, Word, Outlook, Slack — anywhere that accepts rich text.

## Usage
1. Open a Markdown file (or any document with markdown content).
2. Optionally select a range.
3. Run **Markdown: Copy as Rich Text** from the Command Palette (Ctrl+Shift+P).
4. Paste into your destination app.

## Settings
- `copyMarkdownRichText.includeStyles` — include inline CSS (default: true).
- `copyMarkdownRichText.highlightCode` — syntax-highlight code blocks (default: true).

## Platform notes
- **Windows / macOS**: works out of the box.
- **Linux**: requires `xclip` (`sudo apt install xclip` or distro equivalent). Without it, the extension falls back to copying raw HTML as plain text.

## Building / Packaging
```bash
npm install
npm run compile
npx vsce package
```
This produces a `.vsix` you can install via **Extensions → ... → Install from VSIX** in VSCode/VSCodium.
```

- [ ] **Step 2: Verify `.vscodeignore` excludes sources** (it already does — confirm `src/**`, `**/*.ts`, `node_modules/**` are listed; webpack output `dist/` is included).

- [ ] **Step 3: Test packaging end-to-end**

```bash
npx vsce package
```
Expected: a `copy-markdown-as-rich-text-0.0.1.vsix` is produced with no errors. Install it into a clean VSCodium and re-run the smoke test from Task 4 Step 4.

- [ ] **Step 4: Commit**

```bash
git add README.md
git commit -m "docs: usage, settings, and packaging notes"
```

---

## Self-Review Notes

- **Spec coverage:** command name & title (Task 4), selection vs. full doc (Task 4), success toast (Task 4), markdown-it + highlight.js + features (Task 2), inline CSS (Task 2), `text/html` clipboard per-platform (Task 3), fallback warning (Task 4), config keys (Task 4), `engines.vscode` already `^1.118.0` (kept), activation event (Task 4), keywords + `Other` category (Task 4 / existing), `vsce package` instructions (Task 5).
- **Project structure deviation from spec:** spec lists a flat `src/extension.ts`; we add `src/render.ts` and `src/clipboard.ts` so each file has one job. Worth the extra two files.
- **Engines version:** spec said `^1.70.0`, repo already pins `^1.118.0`. Keeping the higher floor — no need to lower it.
- **Untested code paths:** the actual subprocess invocations on each OS aren't unit-tested (would require running on each platform). The smoke test in Task 4 Step 4 covers your local platform; CI on the other two is out of scope for v0.0.1.
