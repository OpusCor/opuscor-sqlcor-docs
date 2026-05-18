/**
 * Single source of truth for SQL Cor product versions.
 *
 * Update this list when a new product version ships. The router,
 * search-index builder, version picker, and "you're viewing an
 * older version" banner all read from here.
 *
 * Ordering: newest first. The first entry is treated as `latest`.
 */
export interface ProductVersion {
  /** Version identifier as it appears in URLs and filenames, e.g. "v1.0" */
  id: string;
  /** Human-readable label for UI, e.g. "v1.0" or "v1.0 (LTS)" */
  label: string;
  /** Semver string for comparison, e.g. "1.0.0" */
  semver: string;
}

export const PRODUCT_VERSIONS: ProductVersion[] = [
  { id: 'v1.0', label: 'v1.0', semver: '1.0.0' },
];

/** The latest product version (used for redirects and as default). */
export const LATEST_VERSION: ProductVersion = PRODUCT_VERSIONS[0];
