# Opuscor Documentation — Architecture

> **Project:** SQL Cor documentation site
> **Stack:** Astro + Starlight
> **Hosted at:** `sql.opuscor.com` (GitHub Pages)
> **Status:** Phase 0 — initial setup
> **Architecture version:** 2 (per-document versioning)

---

## 1. What we are building

A documentation website for **SQL Cor**, served at `sql.opuscor.com`,
deployed as static files to GitHub Pages.

The site must support:

- **Per-document versioning** — each document carries its own version
  history independently of other documents and independently of the
  product release cycle
- **Per-document translations** — most documents are English-only;
  some documents have an additional Ukrainian translation. Future
  languages possible.
- **Site UI in English only** — sidebar, header, footer, search,
  buttons, banners, and all chrome are English. Translations apply
  only to **document content**.
- **Full-text client-side search** with keyboard shortcuts
- **Dark and light themes** (dark is default; respects
  `prefers-color-scheme`)
- **Responsive layout** (desktop, tablet, mobile)
- **Brand identity** following the Opuscor design system (delivered
  in Phase 1)

This is a standalone SQL Cor site. It is **not** a multi-product hub.
The architecture below is reusable as a template for future Opuscor
product docs, but each product ships its own repository.

---

## 2. The core idea — per-document versioning

This is the most important design decision in the project. It shapes
the folder layout, the routing, the search, and the authoring workflow.

### The model

Every document is a **folder** that contains its own version history:

```
src/content/docs/
├── installation/
│   ├── v1.0.md             ← installation as of product version 1.0
│   └── _assets/
│       └── v1.0/
│           └── creatio-import.png
├── user-guide/
│   ├── v1.0.md             ← user-guide as of v1.0
│   ├── v3.0.md             ← user-guide rewritten for v3.0
│   └── _assets/
│       ├── v1.0/
│       │   └── terminal-overview.png
│       └── v3.0/
│           └── terminal-overview.png
└── admin-guide/
    ├── v1.0.md             ← admin-guide as of v1.0
    ├── v2.0.md             ← admin-guide updated for v2.0
    └── _assets/
        ├── v1.0/
        │   └── access-control.png
        └── v2.0/
            └── access-control.png
```

### What this means

- A document file at `installation/v1.0.md` says: *"this is the
  installation page as it stood when SQL Cor v1.0 was the current
  product release."*
- If a document has not changed since its first version, there is
  **one and only one file** for it. No copies, no duplication.
- When the product is updated and a document's content changes, a
  new file is added next to the old one: `user-guide/v3.0.md`.
  The old file is **frozen**.
- Each document has its own version cadence: `installation` may live
  at v1.0 forever; `user-guide` may have v1.0, v3.0; `admin-guide`
  may have v1.0, v2.0.

### Why we chose this over per-site versioning

The simpler alternative ("copy the whole `docs/` folder every time
the product releases a new version") would mean fewer custom code
and native Starlight support. We rejected it because:

- **No duplication of unchanged files.** A typo in installation is
  fixed once, not in every version copy.
- **Cleaner git history.** A change to one document touches one file.
- **Authoring focus.** When editing user-guide, the author only sees
  user-guide files — no noise from other documents' copies.
- **Honest history.** `git log src/content/docs/user-guide/` shows
  the real evolution of that document.

We accept the cost: roughly 300 lines of custom routing TypeScript
in `src/lib/` and one pre-build script for search indexing. This
code is documented, tested, and isolated.

---

## 3. URL structure

```
sql.opuscor.com/                              → redirects to latest version's landing page
sql.opuscor.com/v3.0/                         → landing page for product version 3.0
sql.opuscor.com/v3.0/installation/            → installation document for v3.0
sql.opuscor.com/v3.0/user-guide/              → user-guide for v3.0
sql.opuscor.com/v3.0/reference/features/      → nested document
sql.opuscor.com/v3.0/user-guide/?lang=uk      → Ukrainian translation of user-guide for v3.0
sql.opuscor.com/v1.0/installation/            → installation document for v1.0
```

### The version segment is the requested product version

`/v3.0/` in the URL is the **product version the user is reading
about**. It is not necessarily the document version of the file
being served — see resolution algorithm below.

### Language is a query parameter, not a path segment

`?lang=uk` selects the Ukrainian translation **if it exists for
this specific document**. Pages that have no Ukrainian translation
ignore the parameter and serve English.

The site UI is always in English regardless of `?lang`. Only the
document body changes.

### Why query parameter, not path segment

- Translations are **a per-document feature**, not a site-wide one.
  Most documents are English-only. Mounting `/uk/` as a path segment
  would imply a parallel Ukrainian site, which we explicitly
  do not have.
- Keeps the site structure flat and predictable.
- Easy to omit when no translation exists.

### Anchor support

Anchors work as expected:

```
sql.opuscor.com/v3.0/user-guide/#dry-run-toggle
sql.opuscor.com/v3.0/user-guide/?lang=uk#dry-run-toggle
```

---

## 4. The version resolution algorithm

When a user requests `sql.opuscor.com/v2.5/admin-guide/`, the router
must decide which file to serve.

### Algorithm

```
INPUT:  requested_product_version (e.g. "v2.5")
        document_slug              (e.g. "admin-guide")

STEP 1: List all version files in src/content/docs/{document_slug}/
        Example: [v1.0.md, v2.0.md]

STEP 2: Parse each filename as a semantic version.
        Example: [1.0.0, 2.0.0]

STEP 3: Filter to files where document_version <= requested_product_version
        Example for v2.5: [1.0.0, 2.0.0]

STEP 4: Pick the highest version from the filtered list.
        Example: 2.0.0 → serve admin-guide/v2.0.md

STEP 5: If the filtered list is empty, return a 404 page with the
        message "This document does not exist for SQL Cor v{X}.
        View available versions: v{Y}, v{Z}." (See section 8.)
```

### Examples

Given `admin-guide/` has files `v1.0.md` and `v2.0.md`:

| Request URL | Resolved file | Reason |
|---|---|---|
| `/v1.0/admin-guide/` | `v1.0.md` | exact match |
| `/v1.5/admin-guide/` | `v1.0.md` | highest ≤ 1.5 |
| `/v2.0/admin-guide/` | `v2.0.md` | exact match |
| `/v2.5/admin-guide/` | `v2.0.md` | highest ≤ 2.5 |
| `/v3.0/admin-guide/` | `v2.0.md` | highest ≤ 3.0 |

Given `experimental-feature/` has only file `v3.0.md`:

| Request URL | Resolved file | Reason |
|---|---|---|
| `/v3.0/experimental-feature/` | `v3.0.md` | exact match |
| `/v2.0/experimental-feature/` | **404** | no version ≤ 2.0 |

The 404 page must list available versions and link to them.

### Why no silent redirect

If a user asks for `v2.0/experimental-feature/` and we silently
redirect them to `v3.0/experimental-feature/`, they may not realize
they are now reading documentation for a different product version.
The 404 page is honest, informative, and offers the right next step.

---

## 5. Folder structure of the repository

```
opuscor-sqlcor-docs/                    ← repo root
├── .github/
│   └── workflows/
│       └── deploy.yml                  ← Phase 7
├── public/
│   ├── favicon.svg
│   ├── og-image.png
│   └── CNAME                           ← sql.opuscor.com (Phase 7)
├── src/
│   ├── assets/                         ← site-wide images
│   │   ├── shared/                     ← logos, third-party icons
│   │   ├── brand/                      ← brand visuals (Phase 1)
│   │   └── icons/                      ← UI icons for sidebar etc.
│   ├── components/                     ← Astro components
│   │   ├── DocPage.astro               ← per-document page wrapper
│   │   ├── DocFooter.astro             ← document_version, last_updated
│   │   ├── LanguageSwitcher.astro      ← per-page lang switcher
│   │   ├── VersionBanner.astro         ← "you are reading an older version"
│   │   ├── VersionPicker.astro         ← header version dropdown
│   │   ├── Callout.astro               ← note/tip/warning/danger/important
│   │   └── NotFound404.astro           ← informative 404 page
│   ├── content/
│   │   ├── docs/                       ← all documents live here
│   │   │   ├── installation/
│   │   │   │   ├── v1.0.md
│   │   │   │   └── _assets/
│   │   │   │       └── v1.0/
│   │   │   │           └── *.png
│   │   │   ├── user-guide/
│   │   │   │   ├── v1.0.md
│   │   │   │   ├── v1.0.uk.md
│   │   │   │   ├── v3.0.md
│   │   │   │   ├── v3.0.uk.md
│   │   │   │   └── _assets/
│   │   │   │       ├── v1.0/
│   │   │   │       └── v3.0/
│   │   │   ├── admin-guide/
│   │   │   │   ├── v1.0.md
│   │   │   │   ├── v2.0.md
│   │   │   │   └── _assets/
│   │   │   └── reference/
│   │   │       ├── features/
│   │   │       │   └── v1.0.md
│   │   │       ├── shortcuts/
│   │   │       │   └── v1.0.md
│   │   │       └── messages/
│   │   │           └── v1.0.md
│   │   └── content.config.ts           ← collection schema
│   ├── lib/                            ← custom helpers
│   │   ├── version-resolver.ts         ← resolution algorithm (section 4)
│   │   ├── product-versions.ts         ← list of product versions (config)
│   │   ├── doc-loader.ts               ← load a doc by slug + version
│   │   └── translation-detector.ts     ← does this doc have UK?
│   ├── pages/
│   │   ├── index.astro                 ← redirects to latest version
│   │   ├── 404.astro                   ← informative 404
│   │   └── [version]/
│   │       ├── index.astro             ← landing page for that version
│   │       └── [...slug].astro         ← the document router
│   ├── styles/
│   │   ├── tokens.css                  ← design tokens (Phase 1)
│   │   ├── global.css
│   │   └── starlight-overrides.css
│   └── i18n/
│       └── document-strings/
│           ├── en.json                 ← UI strings shown to readers in English
│           └── uk.json                 ← Ukrainian UI strings shown when ?lang=uk
├── scripts/
│   └── build-search-index.js           ← pre-build for Pagefind (Phase 6)
├── astro.config.mjs
├── package.json
├── tsconfig.json
├── README.md
└── .gitignore
```

### Naming conventions

- **Document folders use kebab-case:** `user-guide`, `admin-guide`,
  `reference/features`.
- **Version files use `v` prefix:** `v1.0.md`, `v2.0.md`. This matches
  the URL form (`/v3.0/`).
- **Translation files add a language suffix:** `v1.0.uk.md`. Language
  codes are ISO 639-1 lowercase (`uk`, `de`, `fr`, ...).
- **Asset folders are underscored:** `_assets/`. Astro ignores
  underscore-prefixed folders for content discovery — this is exactly
  what we want.
- **Asset version folders mirror the document version:**
  `_assets/v1.0/`, `_assets/v3.0/`.

### Adding a new product release that does not change a document

Do nothing. The router automatically serves the most recent matching
version when users navigate to the new product version URL.

### Adding a new document version

```
1. Copy admin-guide/v1.0.md → admin-guide/v2.0.md
2. Edit v2.0.md as needed
3. Bump document_version in frontmatter to 2.0
4. If screenshots changed: create admin-guide/_assets/v2.0/ and
   update image paths in v2.0.md to point to ./_assets/v2.0/...
5. Commit
```

### Adding a translation

```
1. Copy admin-guide/v2.0.md → admin-guide/v2.0.uk.md
2. Translate the body. Keep frontmatter identical except for `lang: uk`.
3. Images stay in _assets/v2.0/ (shared between languages)
4. Commit
```

### Adding a new language

```
1. Decide on the ISO 639-1 code (e.g. de for German)
2. Add UI strings file: src/i18n/document-strings/de.json
3. Translation files now use suffix .de.md
```

---

## 6. Frontmatter contract

Every document file must have this frontmatter:

```yaml
---
title: User Guide
description: Complete guide for SQL Cor users.
sidebar:
  order: 2
  label: User Guide              # optional override; defaults to title
document_version: "3.0"          # MUST match the filename version
last_updated: "2026-05-01"       # optional; falls back to git log
---
```

Optional fields:

```yaml
hero: true                       # render landing-style hero on this page
tableOfContents:
  minHeadingLevel: 2
  maxHeadingLevel: 3
applies_to:                      # optional override of "applies to v{X}"
  min: "2.0"                     # appears in the doc as the minimum compatible version
```

For translation files (`v3.0.uk.md`):

```yaml
---
title: Посібник користувача      # title in the translated language
description: ...
lang: uk                         # required for translation files
# all other fields inherited from the original
---
```

The `document_version` value **must match the filename**:
- File `v1.0.md` → `document_version: "1.0"`
- File `v3.0.md` → `document_version: "3.0"`
- File `v3.0.uk.md` → `document_version: "3.0"`, `lang: "uk"`

Build script validates this and fails the build if there is a
mismatch.

---

## 7. Document page anatomy

Every document page renders this stack of UI elements:

```
┌──────────────────────────────────────────────────────────┐
│  TOP NAVBAR — Opuscor logo, search, version picker,      │
│               theme toggle, GitHub link                  │
├──────────┬───────────────────────────────────────────────┤
│ SIDEBAR  │  ┌──────────────────────────────────────────┐ │
│          │  │ Breadcrumb: Docs › Reference › Features  │ │
│ docs     │  ├──────────────────────────────────────────┤ │
│ tree     │  │ [Version banner — only on older versions]│ │
│          │  ├──────────────────────────────────────────┤ │
│ active   │  │ # Page Title          [🌐 EN | UK] (if   │ │
│ item     │  │                              translation │ │
│          │  │                              exists)     │ │
│          │  ├──────────────────────────────────────────┤ │
│          │  │ Document body content...                 │ │
│          │  │                                          │ │
│          │  │ (rendered Markdown — headings, code,     │ │
│          │  │  callouts, images, tables)               │ │
│          │  │                                          │ │
│          │  ├──────────────────────────────────────────┤ │
│          │  │ Document v1.0 · Applies to SQL Cor v3.0  │ │
│          │  │ Last updated 15 March 2024 · Edit on GH  │ │
│          │  ├──────────────────────────────────────────┤ │
│          │  │ ← Previous: Installation                 │ │
│          │  │                  Next: Admin Guide →     │ │
│          │  └──────────────────────────────────────────┘ │
└──────────┴───────────────────────────────────────────────┘
```

The right rail (TOC, "on this page") sits in the content column on
wide screens and collapses on narrow viewports — exact layout in
Phase 2.

### Footer line (always shown)

```
Document v1.0 · Applies to SQL Cor v3.0 · Last updated 15 March 2024
```

Three pieces of information:
- **Document v1.0** — from frontmatter `document_version`
- **Applies to SQL Cor v3.0** — from URL `/v3.0/`
- **Last updated 15 March 2024** — from frontmatter or git log

### Language switcher (conditional)

A small inline switcher appears **next to the page title** only when
the current document has a translation. Visual: a globe icon plus
language codes; the active language is highlighted.

```
# User Guide                                    [🌐 EN · UK]
```

If a document has only English, the switcher is omitted entirely.
No empty button, no greyed-out icon, no clutter.

### Version banner (conditional)

If the user is reading a page for any product version that is **not
the latest**, a banner appears above the page title:

```
ⓘ  You are viewing docs for SQL Cor v1.0. The latest version is v3.0.
   → View this page in the latest version
```

The "→" link points to the same document slug under the latest
product version. If the document does not exist in the latest
version (rare), the link points to the latest version's landing page.

---

## 8. The 404 page

When the resolver cannot find a version for the requested slug, the
404 page renders:

```
Document not found

The document "admin-guide" does not exist for SQL Cor v0.9.

Available versions of this document:
  • SQL Cor v1.0 — admin-guide v1.0   [link]
  • SQL Cor v2.0 — admin-guide v2.0   [link]
  • SQL Cor v3.0 — admin-guide v2.0   [link]

Or go to:
  → The v3.0 landing page (latest)
  → Search the docs
```

The standard 404 (slug genuinely does not exist anywhere) is
simpler — page-not-found message plus search.

---

## 9. Search

Starlight ships with [Pagefind](https://pagefind.app/), a static
search engine that runs entirely in the browser:

- Indexed at build time, served as static files
- No server, no API
- Keyboard shortcut: `/` or `Cmd/Ctrl+K` opens the search modal

### Per-version filtering

Pagefind indexes every file in `src/content/docs/**/*.md`. Without
filtering, a user reading v2.0 admin-guide who searches for "access
control" would see hits from both `admin-guide/v1.0.md` and
`admin-guide/v2.0.md`.

We solve this with **build-time index filtering**:

A pre-build script (`scripts/build-search-index.js`) computes, for
each product version, the set of document files that are active for
that version (highest version of each document ≤ product version),
and writes one filtered index per product version. Pagefind serves
the right index based on the URL the user is currently on.

Details in Phase 6.

### Search across translations

When the user is viewing `?lang=uk` and searches, the search box
prefers Ukrainian translations of documents that have them, and
falls back to the English version for documents that do not.
Implementation details in Phase 6.

---

## 10. Theme and brand

- CSS custom properties defined in `src/styles/tokens.css`
- Two themes: `:root` (dark, default) and `[data-theme="light"]`
- Starlight has its own CSS variable names; we override them in
  `src/styles/starlight-overrides.css` so Starlight reads our brand
  values everywhere (sidebar, search, TOC, code blocks).
- Theme preference persists in `localStorage` (Starlight handles this)
- Respects `prefers-color-scheme` on first visit

**Phase 0 stubs in minimal placeholder tokens.**
**Phase 1 delivers the full Opuscor design system.**
**Phase 2 maps every Starlight CSS variable to an Opuscor token.**

---

## 11. Deployment

- **Hosting:** GitHub Pages
- **Build:** GitHub Actions workflow in `.github/workflows/deploy.yml`
  (Phase 7)
- **Trigger:** push to `main` branch
- **Custom domain:** `sql.opuscor.com` via `public/CNAME`
- **HTTPS:** GitHub Pages provides Let's Encrypt automatically

---

## 12. Coding conventions

- **All code, comments, file names, variables, and commit messages
  in English.**
- **Ukrainian text appears only inside translation Markdown files
  (`*.uk.md`).**
- **UI strings** live in `src/i18n/document-strings/{lang}.json` —
  shown next to document content (e.g. translated "Last updated"
  label when `?lang=uk`). The chrome of the site never translates.
- **Astro components** for layout and structure.
- **Plain `.md` over `.mdx`** unless a page needs an embedded
  Astro component.
- **No hardcoded brand values.** Always reference a CSS variable
  from `tokens.css`.
- **No third-party UI libraries** — we have our own design system.
- **TypeScript strict mode** for all `.ts` files.
- **Accessibility:** every interactive element has visible focus
  state; every image has `alt`; color contrast meets WCAG AA.

---

## 13. Custom code we are taking on

Per-document versioning is not native to Starlight, so we accept
ownership of this code:

| File | Purpose | Approx LoC |
|------|---------|------------|
| `src/lib/version-resolver.ts` | Implements the algorithm in section 4 | ~80 |
| `src/lib/doc-loader.ts` | Loads a document file given slug + version + lang | ~60 |
| `src/lib/product-versions.ts` | Single source of truth for the list of product versions | ~30 |
| `src/lib/translation-detector.ts` | Checks if `{slug}/{version}.{lang}.md` exists | ~40 |
| `src/pages/[version]/[...slug].astro` | The dynamic router that uses the above | ~120 |
| `scripts/build-search-index.js` | Pre-build filter for Pagefind | ~100 |
| **Total** | | **~430** |

This is the entire deviation from "vanilla Starlight." All other
features (sidebar, TOC, themes, mobile layout, breadcrumbs) come
from Starlight unchanged.

The custom code is **isolated in `src/lib/` and `scripts/`**, fully
typed, documented, and unit-testable. When Starlight releases an
update, none of our custom code interacts with Starlight internals
— we only consume its public component overrides.

---

## 14. What Phase 0 delivers

- [x] Repository initialized with Astro + Starlight
- [x] Folder structure as specified in section 5
- [x] `astro.config.mjs` configured with one product version, no
      Starlight i18n (we handle translations ourselves)
- [x] One stub document `installation/v1.0.md` with English and
      Ukrainian translation files
- [x] One additional stub document `user-guide/v1.0.md` (English only)
      to verify per-document independence
- [x] Minimal `tokens.css` with placeholder dark + light values
- [x] `src/lib/` files implementing version resolution (well-typed,
      with inline comments explaining the algorithm)
- [x] `src/pages/[version]/[...slug].astro` dynamic router
- [x] Custom 404 page (`src/pages/404.astro`) per section 8
- [x] `npm run dev` starts the dev server, all routes work
- [x] `npm run build` produces working static output in `dist/`
- [x] README documenting development, build, adding pages, adding
      versions, adding translations

What Phase 0 does **NOT** deliver:

- ✗ Final brand styling (Phase 1)
- ✗ Migrated SQL Cor content (Phase 3)
- ✗ Most custom components — header, hero, callouts (Phase 2)
- ✗ Version banner UI (Phase 4)
- ✗ Search styling and per-version filtering (Phase 6)
- ✗ Deploy pipeline (Phase 7)

---

## 15. Out of scope

- **CMS.** Decap CMS may be added later, on top of the same Markdown
  files. The per-document folder structure is compatible.
- **Multi-product navigation.** Each product is its own repo + subdomain.
- **The `opuscor.com` parent site.** Separate project.
- **Symlinks for shared assets.** We copy identical screenshots for
  now; symlink migration is deferred.
- **Document-version badges in the sidebar** ("stable since v2.0").
  Nice-to-have; not in Phase 0.

---

*End of architecture document. Phase 0 implementation prompt is in
`CURSOR_PROMPT_PHASE_0.md`. The versioning model is recorded in
`ADR-001-versioning.md`.*
