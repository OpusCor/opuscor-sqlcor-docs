# Opuscor SQL Cor — Documentation Site

Documentation site for SQL Cor, deployed to `sql.opuscor.com`.
Stack: Astro + Starlight with custom per-document versioning.

## Local development

```bash
npm install
npm run dev      # http://localhost:4321/
npm run build    # → dist/
npm run preview  # serves dist/
```

## Project structure

See `ARCHITECTURE.md` for the full picture. Key paths:

- `src/content/sqlcor/<slug>/v{X}.md` — document content
- `src/content/sqlcor/<slug>/_assets/v{X}/...` — images for that version
- `src/lib/product-versions.ts` — list of SQL Cor versions
- `src/pages/[version]/[...slug].astro` — dynamic router
- `src/styles/tokens.css` — design tokens

## How the router works

When you visit `/v3.0/admin-guide/`, the router:

1. Looks in `src/content/sqlcor/admin-guide/` for `v*.md` files
2. Picks the highest version ≤ 3.0
3. Renders that file

If no version is ≤ 3.0, a 404 page appears.

## Adding a new page

Create `src/content/sqlcor/your-new-page/v1.0.md` with frontmatter:

```yaml
---
title: Your Page Title
description: One-line description.
sidebar:
  order: 5
document_version: "1.0"
last_updated: "2026-05-18"
---
```

The router picks it up automatically — no config to update.

## Adding a new version of an existing document

```bash
cp src/content/sqlcor/user-guide/v1.0.md src/content/sqlcor/user-guide/v3.0.md
```

Edit the new file. Bump `document_version` in the frontmatter to
match the filename.

## Adding a new product version

Edit `src/lib/product-versions.ts` and prepend the new version:

```ts
export const PRODUCT_VERSIONS = [
  { id: 'v2.0', label: 'v2.0', semver: '2.0.0' },
  { id: 'v1.0', label: 'v1.0', semver: '1.0.0' },
];
```

The router will start serving `/v2.0/...` URLs immediately.

## Adding a translation

```bash
cp src/content/sqlcor/user-guide/v1.0.md src/content/sqlcor/user-guide/v1.0.uk.md
```

Translate the body. Set `lang: uk` in the frontmatter. The
translation appears at `/v1.0/user-guide/?lang=uk` (full UI in
Phase 2+).

## Phase status

- ✅ Phase 0 — project scaffold, custom router, stub pages
- ⏳ Phase 1 — design system (Opuscor brand)
- ⏳ Phase 2 — page layouts and components
- ⏳ Phase 3 — content migration
- ⏳ Phase 4 — version banner UI, language switcher UI
- ⏳ Phase 6 — search styling and per-version filtering
- ⏳ Phase 7 — GitHub Actions deploy
