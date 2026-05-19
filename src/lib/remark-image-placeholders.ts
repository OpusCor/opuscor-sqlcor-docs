import type { Root } from 'mdast';
import { visit } from 'unist-util-visit';

/**
 * Remark plugin: convert screenshot placeholders into styled figures.
 */

const SCREENSHOT_BLOCKQUOTE_RE = /^\[Screenshot:\s*(.+?)\]$/;

export function remarkImagePlaceholders() {
  return (tree: Root) => {
    visit(tree, 'image', (node: any, index, parent) => {
      if (!parent || typeof index !== 'number') return;
      const alt = node.alt ?? '';
      const url = node.url ?? '';

      if (url.startsWith('./_assets/') || url.startsWith('/')) return;
      if (!alt) return;

      const caption = alt.startsWith('Screenshot:')
        ? alt
        : `Screenshot: ${alt}`;

      parent.children.splice(index, 1, buildPlaceholderHtml(caption));
    });

    visit(tree, 'blockquote', (node: any, index, parent) => {
      if (!parent || typeof index !== 'number') return;
      if (node.children?.length !== 1) return;
      const para = node.children[0];
      if (para.type !== 'paragraph') return;
      if (para.children?.length !== 1) return;
      const text = para.children[0];
      if (text.type !== 'text') return;

      const match = text.value.trim().match(SCREENSHOT_BLOCKQUOTE_RE);
      if (!match) return;

      parent.children.splice(index, 1, buildPlaceholderHtml(`Screenshot: ${match[1]}`));
    });
  };
}

function buildPlaceholderHtml(caption: string) {
  return {
    type: 'html',
    value:
      `<figure class="opuscor-image-placeholder">` +
      `<div class="opuscor-image-placeholder-icon">📷</div>` +
      `<figcaption>${escapeHtml(caption)}</figcaption>` +
      `</figure>`,
  };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
