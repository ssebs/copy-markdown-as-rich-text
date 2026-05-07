import MarkdownIt from 'markdown-it';
import hljs from 'highlight.js';

export interface RenderOptions {
  includeStyles: boolean;
  highlightCode: boolean;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function highlight(code: string, lang: string): string {
  if (lang && hljs.getLanguage(lang)) {
    try {
      const out = hljs.highlight(code, { language: lang, ignoreIllegals: true }).value;
      return `<pre><code class="hljs language-${lang}">${out}</code></pre>`;
    } catch { /* fall through */ }
  }
  return `<pre><code class="hljs">${escapeHtml(code)}</code></pre>`;
}

// Layout/typography only — no fg/bg colors so the destination doc's theme wins.
const STYLES = `
  body { font-family: -apple-system, Segoe UI, Helvetica, Arial, sans-serif; line-height: 1.5; }
  h1, h2, h3, h4 { margin-top: 1.2em; margin-bottom: 0.4em; }
  code { padding: 0.1em 0.3em; border-radius: 3px; font-family: Consolas, Monaco, monospace; }
  pre { padding: 12px; border-radius: 4px; overflow-x: auto; }
  pre code { padding: 0; }
  blockquote { border-left: 4px solid currentColor; margin: 0; padding: 0 1em; }
  table { border-collapse: collapse; }
  th, td { border: 1px solid currentColor; padding: 6px 12px; }
  img { max-width: 100%; }
  hr { border: 0; border-top: 1px solid currentColor; }
`;

export function renderMarkdown(markdown: string, opts: RenderOptions): string {
  const md: MarkdownIt = new MarkdownIt({
    html: true,
    linkify: true,
    typographer: false,
    highlight: opts.highlightCode ? highlight : undefined,
  });
  md.enable(['strikethrough', 'table']);

  const body = md.render(markdown);
  const style = opts.includeStyles ? `<style>${STYLES}</style>` : '';
  return `<!DOCTYPE html><html><head><meta charset="utf-8">${style}</head><body>${body}</body></html>`;
}
