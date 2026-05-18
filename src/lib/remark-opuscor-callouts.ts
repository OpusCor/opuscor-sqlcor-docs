import type { Root } from 'mdast';
import { visit } from 'unist-util-visit';

/**
 * Remark plugin: convert Obsidian-style callouts
 *
 *   > [!warning] Optional title
 *   > Body
 *
 * into our branded HTML:
 *
 *   <aside class="opuscor-callout opuscor-callout--warning">
 *     <div class="opuscor-callout-icon">!</div>
 *     <div class="opuscor-callout-body">
 *       <div class="opuscor-callout-title">
 *         <span class="opuscor-callout-label">Warning</span> Optional title
 *       </div>
 *       <p>Body</p>
 *     </div>
 *   </aside>
 *
 * Supported types: note, tip, warning, danger, important.
 */

const TYPE_META: Record<string, { label: string; icon: string }> = {
  note: { label: 'Note', icon: 'i' },
  tip: { label: 'Tip', icon: '✓' },
  warning: { label: 'Warning', icon: '!' },
  danger: { label: 'Danger', icon: '×' },
  important: { label: 'Important', icon: '§' },
};

const CALLOUT_RE = /^\[!(\w+)\]\s*(.*)$/;

export function remarkOpuscorCallouts() {
  return (tree: Root) => {
    visit(tree, 'blockquote', (node: any, index, parent) => {
      if (!parent || typeof index !== 'number') return;

      const firstChild = node.children?.[0];
      if (firstChild?.type !== 'paragraph') return;
      const firstText = firstChild.children?.[0];
      if (firstText?.type !== 'text') return;

      const lines = firstText.value.split('\n');
      const match = lines[0].match(CALLOUT_RE);
      if (!match) return;

      const type = match[1].toLowerCase();
      const meta = TYPE_META[type];
      if (!meta) return;

      const titleText = match[2].trim();
      const bodyFromFirstLine = lines.slice(1).join('\n').trim();

      firstText.value = bodyFromFirstLine;

      if (!firstText.value && firstChild.children.length === 1) {
        node.children.shift();
      } else if (!firstText.value) {
        firstChild.children = firstChild.children.filter(
          (c: { type: string }) => c.type !== 'text' || c.value !== '',
        );
      }

      const titleHtml = titleText
        ? `<span class="opuscor-callout-label">${meta.label}</span> ${escapeHtml(titleText)}`
        : `<span class="opuscor-callout-label">${meta.label}</span>`;

      const openHtml = {
        type: 'html',
        value:
          `<aside class="opuscor-callout opuscor-callout--${type}">` +
          `<div class="opuscor-callout-icon">${meta.icon}</div>` +
          `<div class="opuscor-callout-body">` +
          `<div class="opuscor-callout-title">${titleHtml}</div>`,
      };
      const closeHtml = {
        type: 'html',
        value: '</div></aside>',
      };

      parent.children.splice(index, 1, openHtml, ...node.children, closeHtml);

      return index + 2 + node.children.length;
    });
  };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
