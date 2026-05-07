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
    await writeHtmlToClipboard(html, markdown);
    vscode.window.showInformationMessage('Copied as rich text!');
  } catch (err) {
    await vscode.env.clipboard.writeText(html);
    const hint = process.platform === 'linux'
      ? 'Install `wl-clipboard` (Wayland) or `xclip` (X11) for rich-text clipboard support.'
      : `Native clipboard write failed: ${(err as Error).message}`;
    vscode.window.showWarningMessage(`Copied as plain HTML instead. ${hint}`);
  }
}
