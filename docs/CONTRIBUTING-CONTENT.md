# Authoring Guide

Everything you need to know to add, edit, and translate documents in
the SQL Cor documentation site.

This guide is for content authors. For project architecture and the
reasoning behind the file layout, see `ARCHITECTURE.md` and
`ADR-001-versioning.md` in the repo root.

---

## Core concepts

The site is built from Markdown files. Each document is a folder. A
folder contains one Markdown file per version of that document.

```
src/content/sqlcor/
└── user-guide/                  ← one folder = one document
    ├── v1.0.md                  ← document content for v1.0
    ├── v1.0.uk.md               ← Ukrainian translation of v1.0
    ├── v3.0.md                  ← document rewritten for v3.0
    └── _assets/                 ← images for this document
        ├── v1.0/
        │   └── terminal.png
        └── v3.0/
            └── terminal.png
```

**Two version concepts to remember:**

- **Product version** — the version of SQL Cor (`v1.0`, `v2.0`,
  `v3.0`). Appears in URLs: `sql.opuscor.com/v2.0/user-guide/`.
- **Document version** — the version of the document file itself
  (`v1.0.md`, `v3.0.md`). Only changes when you rewrite the document.

The router decides which document version to serve based on the
product version requested: it picks the highest document version that
is **less than or equal to** the product version. So `v3.0/user-guide/`
will serve `user-guide/v3.0.md` if it exists, or fall back to
`user-guide/v1.0.md` if v3.0 was never written.

---

## Adding a new document

Say you want to add an "API Reference" document.

### 1. Create the folder and first version file

```
src/content/sqlcor/api-reference/
├── v1.0.md
└── _assets/v1.0/
    └── .gitkeep
```

### 2. Write the frontmatter

```yaml
---
title: API Reference
description: REST and GraphQL endpoints exposed by SQL Cor.
sidebar:
  order: 8
document_version: "1.0"
last_updated: "2026-05-18"
---
```

**Required fields:**
- `title` — page title (appears in tab, sidebar, and as H1)
- `document_version` — must match the filename (`v1.0.md` →
  `"1.0"`). Build fails if they disagree.
- `sidebar.order` — position in the sidebar group. Smaller numbers
  appear first.

**Optional fields:**
- `description` — meta description for SEO and search snippets
- `last_updated` — ISO date. If omitted, falls back to git log
- `sidebar.label` — short label if the title is too long for the
  sidebar

### 3. Add the file to the sidebar

Open `astro.config.mjs` and add an entry under the appropriate group
in the `sidebar:` array:

```js
{
  label: 'Reference',
  items: [
    { label: 'Feature Reference', link: '/v1.0/reference/features/' },
    { label: 'API Reference',     link: '/v1.0/api-reference/' },     // ← new
    // ...
  ],
}
```

### 4. Verify

```bash
npm run dev
```

Visit `http://localhost:4321/v1.0/api-reference/`. The page should
render with the full layout (sidebar, breadcrumb, TOC, doc footer).

---

## Adding a new version of an existing document

Say you updated the User Guide for SQL Cor v3.0 because the UI changed.

### 1. Copy the previous version

```bash
cp src/content/sqlcor/user-guide/v1.0.md \
   src/content/sqlcor/user-guide/v3.0.md
```

### 2. Update the frontmatter

```yaml
---
title: User Guide
description: Complete guide for SQL Cor v3.0 users.
sidebar:
  order: 2
document_version: "3.0"          # ← bump
last_updated: "2026-05-18"       # ← today
---
```

### 3. Edit the content

Change what changed. Leave what did not. The old `v1.0.md` file stays
in place — users still reading v1.0 docs see the unchanged version.

### 4. If screenshots changed, add a new asset version folder

```bash
mkdir -p src/content/sqlcor/user-guide/_assets/v3.0
# Copy or replace screenshots here
```

Reference them in `v3.0.md` as `./_assets/v3.0/terminal.png`.
Old screenshots in `_assets/v1.0/` stay untouched — they are still
needed by `v1.0.md`.

### 5. Register the new product version (one-time per product release)

If v3.0 is a new SQL Cor release, open `src/lib/product-versions.ts`
and prepend the new entry:

```ts
export const PRODUCT_VERSIONS: ProductVersion[] = [
  { id: 'v3.0', label: 'v3.0', semver: '3.0.0' },   // ← new latest
  { id: 'v1.0', label: 'v1.0', semver: '1.0.0' },
];
```

The router will start serving `/v3.0/...` URLs immediately. URLs for
v1.0 keep working.

---

## Adding a translation

Currently supported: Ukrainian (`uk`). Add new languages by following
the same pattern with the appropriate ISO 639-1 code.

### 1. Copy the source version

```bash
cp src/content/sqlcor/user-guide/v1.0.md \
   src/content/sqlcor/user-guide/v1.0.uk.md
```

### 2. Set the language in frontmatter

```yaml
---
title: Посібник користувача          # title in Ukrainian
description: Повний посібник…        # description in Ukrainian
sidebar:
  order: 2
document_version: "1.0"
lang: uk                              # ← required for translations
last_updated: "2026-05-18"
---
```

### 3. Translate the body

Keep all internal links (`/v1.0/admin-guide/`) and screenshots
(`./_assets/v1.0/...`) as-is. Only translate the human-readable text.

### 4. Translation appears automatically

The language switcher next to the page title will appear on
`/v1.0/user-guide/` because a `.uk.md` file now exists. Visit
`/v1.0/user-guide/?lang=uk` to see the translated body. Documents
without a `.uk.md` file show no switcher and stay English.

---

## Working with images

### Where to put images

Inside the document's `_assets/<version>/` folder:

```
src/content/sqlcor/user-guide/
├── v1.0.md
└── _assets/
    └── v1.0/
        ├── terminal-overview.png
        ├── toolbar-controls.png
        └── dry-run-on.png
```

**Why versioned subfolders:** if the UI changes in v3.0, you save the
new screenshot to `_assets/v3.0/terminal-overview.png` and the old
one in `_assets/v1.0/terminal-overview.png` stays in place — so users
reading v1.0 docs see the old UI accurately.

**Why the underscore on `_assets/`:** Astro ignores folders that
start with an underscore when building content collection routes.
Without it, Astro would try to render every image as a page and
crash. Always use `_assets/`, never `assets/`.

### Recommended sizes

| Type | Logical width | Real (2× retina) | Format |
|------|---------------|------------------|--------|
| Inline element (one button, badge) | 400–600 px | 800–1200 px | PNG |
| Component (toolbar, panel) | 800 px | 1600 px | PNG |
| Full page (entire screen) | 1200 px | 2400 px | PNG |
| Hero / landing image | 1600 px | 3200 px | PNG or WebP |
| Diagram, icon | any | — | SVG |
| Open Graph (social preview) | 1200 × 630 | 1200 × 630 | PNG, in `public/` |

**Why 2× retina:** modern Mac, iPad, iPhone, and high-DPI Windows
laptops display each pixel as 2 physical pixels. 1× images look fuzzy
on these screens. Save your screenshots at the 2× width and Astro
will handle responsive scaling.

**Why PNG, not JPEG, for screenshots:** UI screenshots contain sharp
edges, fine lines, and text. JPEG compression smears these into
artifacts. PNG preserves them. Astro will convert PNG to WebP and
AVIF at build time automatically — you do not lose file size
benefits.

**Why SVG for diagrams:** scales infinitely, works in both themes
(can be styled by CSS), and is tiny.

### How to take screenshots

- Use the browser at **100 % zoom** (no system scaling)
- Hide any browser extensions or bookmarks bar that would appear in
  the frame
- Take the screenshot at the recommended 2× size
- For dark/light theme support: take both. Use one or the other
  consistently within a single document. Mixing produces a jarring
  reader experience.

### How to embed in Markdown

```markdown
![Terminal page overview](./_assets/v1.0/terminal-overview.png)
```

The path is relative to the `.md` file. Astro:

- Compresses the image (often 60–80 % smaller)
- Generates WebP and AVIF variants
- Adds responsive `srcset` attributes for retina screens
- Adds `loading="lazy"` for images below the fold
- Generates correct `width` and `height` to prevent layout shift

You write a one-line Markdown link, Astro does the rest.

### Replacing the `[Screenshot: …]` placeholders

The migrated documents contain placeholders like:

```markdown
> [Screenshot: Terminal page with zones labeled]
```

When you produce the actual screenshot, replace the placeholder line
with the real image link:

```markdown
![Terminal page with zones labeled](./_assets/v1.0/terminal-overview.png)
```

---

## Writing style — what works on this site

### Headings

Use H2 (`##`) for top-level sections and H3 (`###`) for subsections.
Skip H1 — the page title (from frontmatter) is rendered as H1 by
Starlight. Avoid going deeper than H4.

### Callouts

We support five callout types. Write them with Obsidian's syntax;
the build converts them to branded HTML.

```markdown
> [!note]
> Background information that's useful but not critical.

> [!tip] Optional title here
> A trick or best practice that improves the reader's outcome.

> [!warning]
> Something to be careful about. Doesn't lose data, but reader
> attention is needed.

> [!danger]
> Irreversible or destructive — use sparingly. Reader **must** read
> this before proceeding.

> [!important]
> Critical context the reader can't skip.
```

### Links

- **Internal links** between documents: use absolute paths starting
  with the product version:
  ```markdown
  See the [Admin Guide](/v1.0/admin-guide/).
  ```
  Anchors work: `/v1.0/admin-guide/#access-control`.
- **External links** are standard Markdown:
  ```markdown
  Read the [PostgreSQL documentation](https://www.postgresql.org/docs/).
  ```
- **Inline code** uses single backticks: `` `SELECT * FROM table` ``.
- **Code blocks** use triple backticks with a language:
  ````markdown
  ```sql
  SELECT * FROM "Contact" LIMIT 10;
  ```
  ````

### Tables

Standard Markdown:

```markdown
| Setting | Default | Range |
|---------|---------|-------|
| Timeout | 30s     | 5–300s |
| Max rows | 1000   | 100–10000 |
```

### What not to do

- Do not paste rich text from Word, Notion, or Google Docs. Hidden
  formatting characters will leak in. Always paste as plain text and
  format with Markdown.
- Do not commit screenshots larger than 2× the maximum display size.
  Files larger than 500 KB after compression should be re-exported.
- Do not invent WikiLink syntax (`[[Page]]`) in new content. We
  converted all of those during migration. New links use standard
  Markdown.

---

## Common pitfalls

### "My new document does not appear in the sidebar"

The sidebar is configured in `astro.config.mjs`, not auto-generated
from the file system. After creating a new document, you must add it
to the sidebar manually. See "Adding a new document → Step 3".

### "Build fails: document_version mismatch"

The frontmatter `document_version` must match the filename version
exactly. `v1.0.md` requires `document_version: "1.0"`. Not `"1.0.0"`,
not `1.0` without quotes.

### "Build fails: callout type 'info' not recognized"

We support exactly five types: `note`, `tip`, `warning`, `danger`,
`important`. Anything else is left as a plain blockquote.

### "My image does not render"

- Check the path: it should be relative to the `.md` file
  (`./_assets/v1.0/foo.png`), not absolute (`/v1.0/.../foo.png`)
- Check the folder name: `_assets`, not `assets`
- Check the file extension is lowercase: `.png`, not `.PNG`
- Run `npm run build` and look at the error output

### "My WikiLink is not converted"

The migration script only runs once, at content migration time. New
content you write should not use `[[WikiLinks]]` — use standard
Markdown links instead.

### "Translation does not show the language switcher"

The switcher only appears when a `<slug>/v{N}.uk.md` file exists for
the document version currently being served. If the user is on
`/v3.0/user-guide/` and only `v1.0.uk.md` exists (no `v3.0.uk.md`),
the switcher will not appear because the v3.0 English page has no
direct translation.

---

## Quick reference

| Task | Command |
|------|---------|
| Run dev server | `npm run dev` |
| Build for production | `npm run build` |
| Preview production build | `npm run preview` |
| Find broken links | inspect `npm run build` output |

| File | Purpose |
|------|---------|
| `src/content/sqlcor/<slug>/v{X}.md` | Document content |
| `src/content/sqlcor/<slug>/_assets/v{X}/` | Images for that version |
| `astro.config.mjs` | Sidebar configuration |
| `src/lib/product-versions.ts` | Product version list |
| `ARCHITECTURE.md` | Repo architecture reference |
| `ADR-001-versioning.md` | Why we chose per-document versioning |

---

*If something is unclear, open an issue or update this guide directly
via PR. It is a living document.*
