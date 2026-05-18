/**
 * Format an ISO date string as "DD Month YYYY" in English.
 *   "2026-05-18" -> "18 May 2026"
 *
 * Returns the input string unchanged if it cannot be parsed.
 */
export function formatDate(iso: string | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}
