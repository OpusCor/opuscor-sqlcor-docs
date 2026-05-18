import fs from 'node:fs';
import path from 'node:path';
import { extractVersionFromFilename } from './version-resolver';

/**
 * Information about a single document folder.
 */
export interface DocInfo {
  /** URL slug, e.g. "user-guide" or "reference/features" */
  slug: string;
  /** Absolute path to the document folder */
  folderPath: string;
  /** List of available document version ids, e.g. ["v1.0", "v3.0"] */
  versions: string[];
  /** Document version ids that have a Ukrainian translation */
  ukVersions: string[];
}

const DOCS_ROOT = path.resolve('src/content/sqlcor');

/**
 * Scans the sqlcor documents directory (`src/content/sqlcor`) and returns metadata about every
 * document folder. A document folder is any folder containing
 * at least one v*.md file.
 */
export function listAllDocs(): DocInfo[] {
  const results: DocInfo[] = [];
  walkDocs(DOCS_ROOT, '', results);
  return results;
}

function walkDocs(currentPath: string, slugPrefix: string, out: DocInfo[]) {
  const entries = fs.readdirSync(currentPath, { withFileTypes: true });
  const mdFiles = entries
    .filter((e) => e.isFile() && e.name.endsWith('.md'))
    .map((e) => e.name);

  const versions = new Set<string>();
  const ukVersions = new Set<string>();

  for (const filename of mdFiles) {
    const version = extractVersionFromFilename(filename);
    if (!version) continue;

    if (filename.endsWith('.uk.md')) {
      ukVersions.add(version);
    } else {
      versions.add(version);
    }
  }

  if (versions.size > 0) {
    out.push({
      slug: slugPrefix,
      folderPath: currentPath,
      versions: [...versions],
      ukVersions: [...ukVersions],
    });
  }

  // Recurse into subfolders (skip _assets and other underscore prefixes)
  for (const entry of entries) {
    if (entry.isDirectory() && !entry.name.startsWith('_')) {
      const childSlug = slugPrefix ? `${slugPrefix}/${entry.name}` : entry.name;
      walkDocs(path.join(currentPath, entry.name), childSlug, out);
    }
  }
}
