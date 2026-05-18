# Opuscor SQL Cor — Documentation Site

Documentation site for SQL Cor, deployed to `sql.opuscor.com`.
Stack: Astro + Starlight with custom per-document versioning.

## For content authors

If you want to add, edit, or translate documents, start here:
**[Authoring Guide](./docs/CONTRIBUTING-CONTENT.md)**.

It covers adding new documents, new versions, translations, working
with images, writing style, and common pitfalls.

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

See [Authoring Guide → Adding a new document](./docs/CONTRIBUTING-CONTENT.md#adding-a-new-document).

## Adding a new version of an existing document

See [Authoring Guide → Adding a new version](./docs/CONTRIBUTING-CONTENT.md#adding-a-new-version-of-an-existing-document).

## Adding a translation

See [Authoring Guide → Adding a translation](./docs/CONTRIBUTING-CONTENT.md#adding-a-translation).

## Adding a new product version

Edit `src/lib/product-versions.ts` and prepend the new version:

```ts
export const PRODUCT_VERSIONS = [
  { id: 'v2.0', label: 'v2.0', semver: '2.0.0' },
  { id: 'v1.0', label: 'v1.0', semver: '1.0.0' },
];
```

The router will start serving `/v2.0/...` URLs immediately.

## Phase status

- ✅ Phase 0 — project scaffold, custom router, stub pages
- ⏳ Phase 1 — design system (Opuscor brand)
- ⏳ Phase 2 — page layouts and components
- ⏳ Phase 3 — content migration
- ⏳ Phase 4 — version banner UI, language switcher UI
- ⏳ Phase 6 — search styling and per-version filtering
- ⏳ Phase 7 — GitHub Actions deploy
