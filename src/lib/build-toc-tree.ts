/** Flat markdown heading as returned by `render()`. */
export interface FlatHeading {
  depth: number;
  slug: string;
  text: string;
}

export interface TocNode {
  depth: number;
  slug: string;
  text: string;
  children: TocNode[];
}

/** Mirror Starlight's `generateToC()` nesting for client-side TOC swaps. */
export function buildTocTree(
  headings: FlatHeading[],
  minLevel: number,
  maxLevel: number,
  overviewTitle: string,
): TocNode[] {
  const filtered = headings.filter(
    (heading) => heading.depth >= minLevel && heading.depth <= maxLevel,
  );
  const toc: TocNode[] = [
    { depth: 2, slug: '_top', text: overviewTitle, children: [] },
  ];

  for (const heading of filtered) {
    injectChild(toc, { ...heading, children: [] });
  }

  return toc;
}

function injectChild(items: TocNode[], item: TocNode): void {
  const lastItem = items.at(-1);
  if (!lastItem || lastItem.depth >= item.depth) {
    items.push(item);
  } else {
    injectChild(lastItem.children, item);
  }
}

export function tocTreeToHtml(nodes: TocNode[], isMobile = false): string {
  const cls = isMobile ? ' class="isMobile"' : '';
  let html = `<ul${cls}>`;

  for (const node of nodes) {
    html += `<li><a href="#${node.slug}"><span>${escapeHtml(node.text)}</span></a>`;
    if (node.children.length > 0) {
      html += tocTreeToHtml(node.children, isMobile);
    }
    html += '</li>';
  }

  html += '</ul>';
  return html;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
