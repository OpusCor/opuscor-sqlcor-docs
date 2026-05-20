#!/usr/bin/env node
// @ts-check

/**
 * Content migration script for Phase 3 / Phase 7.5.
 *
 * Reads source Markdown files (Obsidian-flavored) and writes them
 * into src/content/sqlcor/<slug>/v1.0.md (or v1.0.uk.md) with our schema.
 *
 * Transformations:
 *   - Frontmatter rewritten to our schema (drops `tags`, `aliases`,
 *     `related`; adds `document_version`, `last_updated`,
 *     `sidebar.order`)
 *   - [[WikiLink]] -> [WikiLink](/url/)
 *   - [[WikiLink#anchor]] -> [WikiLink](/url/#anchor)
 *   - [[WikiLink|Alias]] -> [Alias](/url/)
 *   - [[Non-mapped/path]] -> stripped to plain text in italics
 *
 * Usage:
 *   node scripts/migrate-content.mjs <source-file> <target-slug> <order> [options]
 *
 * Options:
 *   --uk              Write v1.0.uk.md and add lang: uk
 *   --title "..."     Override title (for broken Obsidian frontmatter)
 *   --description "..."  Override description (required by schema)
 *
 * Example:
 *   node scripts/migrate-content.mjs ./src/content/sqlcor/User_Guide.md user-guide 2
 *   node scripts/migrate-content.mjs ./src/content/sqlcor/Довідник функцій.md reference/features 4 --uk
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * @param {string} s
 */
function toTitleCase(s) {
  return s
    .split(/[_\s]+/)
    .map((word) => {
      const isShortAllCaps = word.length <= 3 && word === word.toUpperCase();
      if (isShortAllCaps) return word;
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MAP_PATH = path.join(__dirname, 'wikilink-map.json');
const TARGET_ROOT = path.resolve(__dirname, '..', 'src', 'content', 'sqlcor');

/** @type {Record<string, string>} */
const wikiMap = JSON.parse(fs.readFileSync(MAP_PATH, 'utf-8'));

const args = process.argv.slice(2);
const positional = [];
/** @type {{ uk?: boolean, title?: string, description?: string }} */
const flags = {};

for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if (arg === '--uk') {
    flags.uk = true;
  } else if (arg === '--title' && args[i + 1]) {
    flags.title = args[++i];
  } else if (arg === '--description' && args[i + 1]) {
    flags.description = args[++i];
  } else {
    positional.push(arg);
  }
}

const [sourcePath, targetSlug, orderStr] = positional;
if (!sourcePath || !targetSlug) {
  console.error(
    'Usage: migrate-content.mjs <source> <slug> <order> [--uk] [--title "..."] [--description "..."]',
  );
  process.exit(1);
}

const order = orderStr ? parseInt(orderStr, 10) : 99;
const raw = fs.readFileSync(sourcePath, 'utf-8');

/**
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
 * Parse broken Obsidian exports where metadata appears as `## title: ...` after `---`.
 * @param {string} body
 * @param {Record<string, string>} fm
 */
function parseBrokenObsidianMeta(body, fm) {
  const lines = body.split('\n');
  let i = 0;
  while (i < lines.length) {
    const line = lines[i].trim();
    if (!line.startsWith('## ')) break;

    const meta = line.slice(3).trim();
    const titleMatch = meta.match(/^title:\s*(.+)$/i);
    if (titleMatch) {
      fm.title = titleMatch[1].trim();
      i++;
      continue;
    }

    const kvMatch = meta.match(/^([a-z_]+):\s*(.+)$/i);
    if (kvMatch && ['tags', 'aliases', 'related', 'description'].includes(kvMatch[1])) {
      if (kvMatch[1] === 'description') fm.description = kvMatch[2].trim();
      i++;
      continue;
    }

    break;
  }

  return { fm, body: lines.slice(i).join('\n') };
}

/**
 * @param {string} body
 */
function convertWikiLinks(body) {
  return body.replace(/\[\[([^\]]+)\]\]/g, (_full, inner) => {
    let alias = null;
    const aliasMatch = inner.match(/^(.+?)\\?\|(.+)$/);
    if (aliasMatch) {
      inner = aliasMatch[1];
      alias = aliasMatch[2];
    }

    let anchor = '';
    const anchorMatch = inner.match(/^(.+?)#(.+)$/);
    if (anchorMatch) {
      inner = anchorMatch[1];
      anchor = '#' + anchorMatch[2];
    }

    const url = wikiMap[inner];
    const label = alias ?? toTitleCase(inner);

    if (!url) {
      return `*${label}*`;
    }

    return `[${label}](${url}${anchor})`;
  });
}

/**
 * @param {Record<string, string>} fm
 */
/**
 * @param {string} value
 */
function yamlQuote(value) {
  return `"${String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

function buildFrontmatter(fm) {
  const title = flags.title ?? fm.title ?? targetSlug;
  const description =
    flags.description ?? fm.description ?? 'SQL Cor documentation.';
  const lastUpdated = '2026-05-20';

  const lines = [
    '---',
    `title: ${yamlQuote(title)}`,
    `description: ${yamlQuote(description)}`,
    'sidebar:',
    `  order: ${order}`,
    'document_version: "1.0"',
    flags.uk ? 'lang: uk' : null,
    `last_updated: "${lastUpdated}"`,
    '---',
    '',
  ].filter((x) => x !== null);

  return lines.join('\n');
}

let { fm, body } = splitFrontmatter(raw);
({ fm, body } = parseBrokenObsidianMeta(body, fm));

const bodyNoH1 = body.replace(/^\s*# [^\n]+\n+/, '');
const converted = convertWikiLinks(bodyNoH1);
const out = buildFrontmatter(fm) + converted.trimStart();

const targetDir = path.join(TARGET_ROOT, ...targetSlug.split('/'));
fs.mkdirSync(targetDir, { recursive: true });
fs.mkdirSync(path.join(targetDir, '_assets', 'v1.0'), { recursive: true });

const targetFile = path.join(targetDir, flags.uk ? 'v1.0.uk.md' : 'v1.0.md');
fs.writeFileSync(targetFile, out, 'utf-8');

console.log(`Migrated: ${sourcePath} → ${path.relative(process.cwd(), targetFile)}`);
