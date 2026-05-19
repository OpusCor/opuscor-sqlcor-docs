import { listAllDocs } from './doc-loader';
import { PRODUCT_VERSIONS } from './product-versions';
import { resolveDocumentVersion } from './version-resolver';

/**
 * Build a Set of all `/vX.Y/<slug>/` URLs that have a Ukrainian
 * translation for the resolved document version.
 *
 * Used by the sidebar override to decide whether to render a UK
 * badge next to a sidebar link.
 *
 * Computed once per build. Cheap — only runs on the build server.
 */
export function buildTranslationManifest(): Set<string> {
  const manifest = new Set<string>();
  const docs = listAllDocs();

  for (const product of PRODUCT_VERSIONS) {
    for (const doc of docs) {
      const resolved = resolveDocumentVersion(product.id, doc.versions);
      if (!resolved) continue;
      if (doc.ukVersions.includes(resolved)) {
        manifest.add(`/${product.id}/${doc.slug}/`);
      }
    }
  }

  return manifest;
}

/** Pre-compute once at module load. */
export const TRANSLATION_MANIFEST = buildTranslationManifest();
