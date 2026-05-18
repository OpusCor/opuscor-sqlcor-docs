import semver from 'semver';

/**
 * Parses a version string like "v1.0" or "v3.2.1" into a semver
 * string suitable for comparison. Tolerates 1-, 2-, and 3-part
 * versions; pads to 3 parts (e.g. "v1.0" -> "1.0.0").
 *
 * Returns null if the input is not a valid version.
 */
export function parseVersionId(versionId: string): string | null {
  const stripped = versionId.startsWith('v') ? versionId.slice(1) : versionId;
  const parts = stripped.split('.');
  while (parts.length < 3) parts.push('0');
  const candidate = parts.join('.');
  return semver.valid(candidate);
}

/**
 * Extracts a version id from a filename like "v1.0.md" or
 * "v3.0.uk.md". Returns null if the filename does not match.
 */
export function extractVersionFromFilename(filename: string): string | null {
  const match = filename.match(/^(v\d+\.\d+(?:\.\d+)?)(?:\.[a-z]{2})?\.md$/);
  return match ? match[1] : null;
}

/**
 * Resolves the best matching document version for a requested
 * product version, given the list of available document versions
 * for that document.
 *
 * Algorithm (see ARCHITECTURE.md section 4):
 *   1. Filter document versions to those <= the requested version.
 *   2. Return the highest remaining. Return null if none match.
 *
 * @example
 *   resolveDocumentVersion("v2.5", ["v1.0", "v2.0"]) === "v2.0"
 *   resolveDocumentVersion("v0.9", ["v1.0", "v2.0"]) === null
 *   resolveDocumentVersion("v2.0", ["v2.0"])         === "v2.0"
 */
export function resolveDocumentVersion(
  requestedVersionId: string,
  availableDocVersionIds: string[],
): string | null {
  const requested = parseVersionId(requestedVersionId);
  if (!requested) return null;

  const candidates = availableDocVersionIds
    .map((id) => ({ id, semver: parseVersionId(id) }))
    .filter((x): x is { id: string; semver: string } => x.semver !== null)
    .filter((x) => semver.lte(x.semver, requested));

  if (candidates.length === 0) return null;

  candidates.sort((a, b) => semver.rcompare(a.semver, b.semver));
  return candidates[0].id;
}
