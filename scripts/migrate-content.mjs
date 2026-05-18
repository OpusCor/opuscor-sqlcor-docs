#!/usr/bin/env node
// @ts-check

/**
 * Content migration script for Phase 3.
 *
 * Reads source Markdown files (Obsidian-flavored) and writes them
 * into src/content/sqlcor/<slug>/v1.0.md with our schema.
 *
 * Transformations:
 *   - Frontmatter rewritten to our schema (drops `tags`, `aliases`,
 *     `related`; adds `document_version`, `last_updated`,
 *     `sidebar.order`)
 *   - [[WikiLink]] -> [WikiLink](/url/)
 *   - [[WikiLink#anchor]] -> [WikiLink](/url/#anchor)
 *   - [[WikiLink|Alias]] -> [Alias](/url/)
 *   - [[Non-mapped/path]] -> stripped to plain text in italics
 *     (avoids broken links to unrelated Obsidian notes)
 *
 * Source files are NOT modified. The script is idempotent — running
 * it twice produces the same output.
 *
 * Usage:
 *   node scripts/migrate-content.mjs <source-file> <target-slug> <order>
 *
 * Example:
 *   node scripts/migrate-content.mjs ./inbox/User_Guide.md user-guide 2
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MAP_PATH = path.join(__dirname, 'wikilink-map.json');
const TARGET_ROOT = path.resolve(__dirname, '..', 'src', 'content', 'sqlcor');

/** @type {Record<string, string>} */
const wikiMap = JSON.parse(fs.readFileSync(MAP_PATH, 'utf-8'));

const [, , sourcePath, targetSlug, orderStr] = process.argv;
if (!sourcePath || !targetSlug) {
  console.error('Usage: migrate-content.mjs <source> <slug> <order>');
  process.exit(1);
}

const order = orderStr ? parseInt(orderStr, 10) : 99;
const raw = fs.readFileSync(sourcePath, 'utf-8');

/**
 * Split a markdown file into frontmatter and body.
 * @param {string} input
 * @returns {{ fm: Record<string, string>, body: string }}
 */
function splitFrontmatter(input) {
  const match = input.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) return { fm: {}, body: input };

  /** @type {Record<string, string>} */
  const fm = {};
  for (const line of match[1].split('\n')) {
    const m = line.match(/^([a-z_]+):\s*(.*)$/i);
    if (m) fm[m[1]] = m[2];
  }
  return { fm, body: match[2] };
}

/**
 * Convert all [[WikiLink]] forms to Markdown links.
 * @param {string} body
 */
function convertWikiLinks(body) {
  return body.replace(/\[\[([^\]]+)\]\]/g, (full, inner) => {
    // Handle [[Target|Alias]]
    let alias = null;
    const aliasMatch = inner.match(/^(.+?)\\?\|(.+)$/);
    if (aliasMatch) {
      inner = aliasMatch[1];
      alias = aliasMatch[2];
    }

    // Handle [[Target#anchor]]
    let anchor = '';
    const anchorMatch = inner.match(/^(.+?)#(.+)$/);
    if (anchorMatch) {
      inner = anchorMatch[1];
      anchor = '#' + anchorMatch[2];
    }

    const url = wikiMap[inner];
    const label = alias ?? inner.replace(/_/g, ' ');

    if (!url) {
      // Unknown target (e.g. ★ For Google AI Studio/ARCHITECTURE).
      // Render as italic text — link target does not exist on the site.
      return `*${label}*`;
    }

    return `[${label}](${url}${anchor})`;
  });
}

/**
 * Build the new frontmatter block.
 * @param {Record<string, string>} fm
 * @returns {string}
 */
function buildFrontmatter(fm) {
  const title = fm.title ?? targetSlug;
  const description = fm.description ?? '';
  const today = new Date().toISOString().slice(0, 10);

  const lines = [
    '---',
    `title: ${title}`,
    description ? `description: ${description}` : null,
    'sidebar:',
    `  order: ${order}`,
    'document_version: "1.0"',
    `last_updated: "${today}"`,
    '---',
    '',
  ].filter((x) => x !== null);

  return lines.join('\n');
}

const { fm, body } = splitFrontmatter(raw);

// Strip the leading H1 from the body — Starlight renders the title
// from frontmatter, so a duplicate H1 looks wrong.
const bodyNoH1 = body.replace(/^\s*# [^\n]+\n+/, '');

const converted = convertWikiLinks(bodyNoH1);
const out = buildFrontmatter(fm) + converted.trimStart();

// Target path: src/content/sqlcor/<targetSlug>/v1.0.md (supports nested slugs like reference/features)
const targetDir = path.join(TARGET_ROOT, ...targetSlug.split('/'));
fs.mkdirSync(targetDir, { recursive: true });
fs.mkdirSync(path.join(targetDir, '_assets', 'v1.0'), { recursive: true });

const targetFile = path.join(targetDir, 'v1.0.md');
fs.writeFileSync(targetFile, out, 'utf-8');

console.log(`Migrated: ${sourcePath} → ${path.relative(process.cwd(), targetFile)}`);
