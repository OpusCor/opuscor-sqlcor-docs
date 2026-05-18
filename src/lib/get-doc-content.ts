import { getEntry } from 'astro:content';

/**
 * Load a sqlcor entry by its content collection ID.
 *
 * Collection IDs follow the pattern:
 *   `<slug>/v1.0`         — English document
 *   `<slug>/v1.0.uk`      — Ukrainian translation
 *
 * Returns null if the entry does not exist.
 */
export async function getSqlcorEntry(entryId: string) {
  try {
    return await getEntry('sqlcor', entryId);
  } catch {
    return null;
  }
}

/**
 * Astro's glob loader slugifies version filenames: dots are removed from
 * the path segment (e.g. `v1.0.md` → entry id `installation/v10`).
 */
function versionToEntrySegment(version: string): string {
  return version.replace(/\./g, '');
}

/**
 * Build the entry ID for a document at a specific version and lang.
 *
 *   buildEntryId("installation", "v1.0", "en") -> "installation/v10"
 *   buildEntryId("installation", "v1.0", "uk") -> "installation/v10uk"
 *   buildEntryId("reference/features", "v2.0", "en") -> "reference/features/v20"
 */
export function buildEntryId(
  slug: string,
  version: string,
  lang: 'en' | 'uk' = 'en',
): string {
  const segment = versionToEntrySegment(version);
  return lang === 'uk' ? `${slug}/${segment}uk` : `${slug}/${segment}`;
}
