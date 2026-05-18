# Cursor Prompt — Phase 0: Project Setup

> Paste this entire file into Cursor as the task. It defines what to
> build, how to build it, and how to verify success.

---

## Context

I am building a documentation website for **SQL Cor**, hosted at
`sql.opuscor.com` on GitHub Pages. The stack is **Astro + Starlight**.

This is **Phase 0** — scaffold the project, set up the per-document
versioning model, and implement the custom routing logic that makes
that model work. Brand styling, custom UI components, content
migration, and deployment come in later phases.

Before you write any code, **read `ARCHITECTURE.md` and
`ADR-001-versioning.md`** in this folder. They define:

- The folder layout (architecture section 5)
- The version resolution algorithm (architecture section 4)
- The 404 behavior (architecture section 8)
- The URL structure (architecture section 3)
- The frontmatter contract (architecture section 6)
- Why we chose per-document versioning (ADR-001)

These documents are authoritative. If anything in this prompt
conflicts with them, the architecture documents win.

---

## Task

Set up a new Astro project with Starlight, configured for:

- **Per-document versioning** — implement the custom router that
  resolves `/v{X}/<slug>/` URLs to the correct document file
- **One product version configured** — `v1.0`, defined as `latest`
- **One stub document with English + Ukrainian translation files**
  to verify the translation switcher will work later
- **One stub document, English only** to verify documents without
  translations render correctly
- **One pages that should 404** in a way that exercises the 404 page
- **Placeholder design tokens** in `src/styles/tokens.css`

Do **not** migrate the real SQL Cor content yet (Phase 3).
Do **not** build branded UI components yet (Phase 2).
Do **not** configure deployment yet (Phase 7).

---

## Step-by-step

### Step 1 — Scaffold the project

```bash
npm create astro@latest opuscor-sqlcor-docs -- --template starlight --typescript strict --no-install --no-git
cd opuscor-sqlcor-docs
npm install
```

Confirm the default Starlight site runs:

```bash
npm run dev
```

Then stop the server.

### Step 2 — Reshape the folder structure

Match `ARCHITECTURE.md` section 5. Specifically:

- **Delete** the example content under `src/content/docs/` from the
  starter
- **Create** these folders (use `.gitkeep` files in empty ones):
  ```
  src/components/
  src/lib/
  src/styles/
  src/assets/shared/
  src/assets/brand/
  src/assets/icons/
  src/i18n/document-strings/
  scripts/
  ```

### Step 3 — Define the product versions config

Create `src/lib/product-versions.ts`:

```ts
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
```

### Step 4 — Implement the version resolver

Create `src/lib/version-resolver.ts`. Implements the algorithm from
`ARCHITECTURE.md` section 4.

```ts
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
 * Algorithm:
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
```

Add `semver` to dependencies:

```bash
npm install semver
npm install --save-dev @types/semver
```

### Step 5 — Implement the document loader

Create `src/lib/doc-loader.ts`:

```ts
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

const DOCS_ROOT = path.resolve('src/content/docs');

/**
 * Scans the docs directory and returns metadata about every
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
```

### Step 6 — Create the dynamic router

Create `src/pages/[version]/[...slug].astro`:

```astro
---
/**
 * Dynamic document router.
 *
 * Resolves URLs of the form /vX.Y/some/slug/ to the correct
 * document file using the algorithm in ARCHITECTURE.md section 4.
 *
 * Returns a 404 page (via Astro's redirect to /404) when no
 * version of the document matches the requested product version.
 */
import { PRODUCT_VERSIONS } from '../../lib/product-versions';
import { listAllDocs } from '../../lib/doc-loader';
import { resolveDocumentVersion } from '../../lib/version-resolver';
import fs from 'node:fs';
import path from 'node:path';

export function getStaticPaths() {
  const docs = listAllDocs();
  const paths: { params: { version: string; slug: string }; props: any }[] = [];

  for (const product of PRODUCT_VERSIONS) {
    for (const doc of docs) {
      const resolvedVersion = resolveDocumentVersion(product.id, doc.versions);
      if (!resolvedVersion) continue;

      const filePath = path.join(doc.folderPath, `${resolvedVersion}.md`);
      const content = fs.readFileSync(filePath, 'utf-8');

      paths.push({
        params: { version: product.id, slug: doc.slug },
        props: {
          productVersion: product.id,
          documentVersion: resolvedVersion,
          slug: doc.slug,
          rawContent: content,
          hasUkTranslation: doc.ukVersions.includes(resolvedVersion),
        },
      });
    }
  }

  return paths;
}

const { productVersion, documentVersion, slug, rawContent, hasUkTranslation } = Astro.props;
---

<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>{slug} — SQL Cor {productVersion}</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
  </head>
  <body>
    <main style="font-family: system-ui; padding: 2rem; max-width: 720px; margin: 0 auto;">
      <p style="opacity: 0.6; font-family: monospace; font-size: 12px;">
        ROUTER OK — Phase 0 stub layout
      </p>
      <h1>{slug}</h1>
      <p>
        Requested SQL Cor: <strong>{productVersion}</strong> · Serving
        document version <strong>{documentVersion}</strong>
        {hasUkTranslation && <em>· UK translation available</em>}
      </p>
      <hr />
      <pre style="white-space: pre-wrap; background: #f4f4f4; padding: 1rem; border-radius: 4px;">{rawContent}</pre>
      <hr />
      <p style="font-size: 13px; opacity: 0.7;">
        Document {documentVersion} · Applies to SQL Cor {productVersion}
      </p>
    </main>
  </body>
</html>
```

This is intentionally **plain HTML with no Starlight layout** in
Phase 0. Real layout integration happens in Phase 2.

### Step 7 — Create the version landing page

Create `src/pages/[version]/index.astro`:

```astro
---
/**
 * Landing page for a specific product version.
 * Phase 0: simple link list. Phase 2 turns this into a real hero page.
 */
import { PRODUCT_VERSIONS } from '../../lib/product-versions';
import { listAllDocs } from '../../lib/doc-loader';
import { resolveDocumentVersion } from '../../lib/version-resolver';

export function getStaticPaths() {
  return PRODUCT_VERSIONS.map((v) => ({ params: { version: v.id } }));
}

const { version } = Astro.params;
const docs = listAllDocs();
const availableDocs = docs
  .map((doc) => ({
    slug: doc.slug,
    resolved: resolveDocumentVersion(version!, doc.versions),
  }))
  .filter((d) => d.resolved !== null);
---

<html lang="en">
  <head><meta charset="utf-8" /><title>SQL Cor {version} — Documentation</title></head>
  <body style="font-family: system-ui; padding: 2rem; max-width: 720px; margin: 0 auto;">
    <h1>SQL Cor — {version}</h1>
    <p>Documentation index. Phase 0 stub.</p>
    <ul>
      {availableDocs.map((d) => (
        <li><a href={`/${version}/${d.slug}/`}>{d.slug}</a> <small>(doc {d.resolved})</small></li>
      ))}
    </ul>
  </body>
</html>
```

### Step 8 — Create the root index that redirects to latest

Create `src/pages/index.astro`:

```astro
---
/**
 * Root URL — redirects to the latest product version's landing page.
 */
import { LATEST_VERSION } from '../lib/product-versions';
return Astro.redirect(`/${LATEST_VERSION.id}/`, 308);
---
```

### Step 9 — Create the informative 404 page

Create `src/pages/404.astro`:

```astro
---
/**
 * Informative 404 page per ARCHITECTURE.md section 8.
 *
 * When a user requests /vX.Y/some-doc/ but no version of "some-doc"
 * satisfies vX.Y, the static build does not produce a page for that
 * URL — GitHub Pages serves this 404.
 *
 * Phase 0: minimal text. Phase 2 styles it.
 */
import { PRODUCT_VERSIONS, LATEST_VERSION } from '../lib/product-versions';
---

<html lang="en">
  <head><meta charset="utf-8" /><title>Not found — SQL Cor docs</title></head>
  <body style="font-family: system-ui; padding: 2rem; max-width: 720px; margin: 0 auto;">
    <h1>Document not found</h1>
    <p>
      The page you requested does not exist for this product version.
    </p>
    <h2>Try:</h2>
    <ul>
      <li><a href={`/${LATEST_VERSION.id}/`}>Latest documentation ({LATEST_VERSION.label})</a></li>
      {PRODUCT_VERSIONS.length > 1 && (
        <li>
          Other versions:
          {PRODUCT_VERSIONS.map((v) => (
            <a href={`/${v.id}/`} style="margin-right: 0.5rem;">{v.label}</a>
          ))}
        </li>
      )}
    </ul>
  </body>
</html>
```

### Step 10 — Configure Astro

Replace `astro.config.mjs` with:

```js
// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

export default defineConfig({
  site: 'https://sql.opuscor.com',
  output: 'static',

  integrations: [
    starlight({
      title: 'SQL Cor',
      description: 'Secure SQL Workbench for Creatio',

      // The site UI is English-only. Per-document translations are
      // handled by our custom router via ?lang=uk, not by Starlight's
      // i18n. We do NOT configure `defaultLocale` or `locales`.

      customCss: [
        './src/styles/tokens.css',
        './src/styles/starlight-overrides.css',
      ],

      // Phase 0: minimal sidebar. Phase 2 replaces this with a
      // brand-styled sidebar that reads from product-versions.ts.
      sidebar: [
        {
          label: 'Phase 0 stubs',
          items: [
            { label: 'Latest landing', link: '/v1.0/' },
          ],
        },
      ],

      social: [],
    }),
  ],
});
```

### Step 11 — Create the design token placeholders

**`src/styles/tokens.css`:**

```css
/*
 * Opuscor design tokens — PHASE 0 PLACEHOLDER.
 * Phase 1 replaces this with the full Opuscor design system.
 */
:root {
  --opuscor-bg: #0E1729;
  --opuscor-bg2: #131D33;
  --opuscor-surf: #182542;
  --opuscor-bdr: #243352;
  --opuscor-tx: #E8EEF8;
  --opuscor-muted: #94A3B8;
  --opuscor-accent: #4FC3FF;
  --opuscor-accent-h: #29AAE2;
  --opuscor-ff-sans: 'Inter', system-ui, -apple-system, sans-serif;
  --opuscor-ff-mono: 'JetBrains Mono', Consolas, ui-monospace, monospace;
}

[data-theme='light'] {
  --opuscor-bg: #F4F7FB;
  --opuscor-bg2: #ECF1F8;
  --opuscor-surf: #FFFFFF;
  --opuscor-bdr: #DDE3EF;
  --opuscor-tx: #0F172A;
  --opuscor-muted: #475569;
  --opuscor-accent: #0284C7;
  --opuscor-accent-h: #0369A1;
}
```

**`src/styles/starlight-overrides.css`:**

```css
/*
 * Starlight CSS variable overrides — PHASE 0 PLACEHOLDER.
 * Phase 2 maps every Starlight variable to an Opuscor token.
 */
```

**`src/styles/global.css`:** create an empty file. Phase 2 fills it.

### Step 12 — Create the stub documents

Goal: exercise four code paths — exact-version match, lower-version
fallback, English-only document, and document with translation.

**`src/content/docs/installation/v1.0.md`:**

```markdown
---
title: Installation
description: How to install SQL Cor into your Creatio environment.
sidebar:
  order: 1
document_version: "1.0"
last_updated: "2026-05-18"
---

# Installation

This is a Phase 0 stub for the installation document.

Reaching this page via `/v1.0/installation/` confirms that the
custom router resolved an exact version match.
```

**`src/content/docs/installation/v1.0.uk.md`:**

```markdown
---
title: Установлення
description: Як установити SQL Cor у середовище Creatio.
sidebar:
  order: 1
  label: Установлення
document_version: "1.0"
lang: uk
last_updated: "2026-05-18"
---

# Установлення

Заглушка для документа з установлення (Phase 0).

Якщо ви бачите цю сторінку через `?lang=uk` — перемикач мов знає,
що для цього документа існує переклад.
```

**`src/content/docs/user-guide/v1.0.md`:**

```markdown
---
title: User Guide
description: Complete guide for SQL Cor users.
sidebar:
  order: 2
document_version: "1.0"
last_updated: "2026-05-18"
---

# User Guide

This is a Phase 0 stub for the user guide. English only.

If you navigate to this page, the language switcher should not
appear in the UI (later phase) because no `.uk.md` file exists.
```

**Underscore-prefixed assets folders** (create even if empty, with a
`.gitkeep`):

```
src/content/docs/installation/_assets/v1.0/.gitkeep
src/content/docs/user-guide/_assets/v1.0/.gitkeep
```

### Step 13 — Create the content collection schema

Create `src/content.config.ts`:

```ts
import { defineCollection, z } from 'astro:content';
import { docsLoader } from '@astrojs/starlight/loaders';
import { docsSchema } from '@astrojs/starlight/schema';

// We extend Starlight's schema with our two custom frontmatter fields.
export const collections = {
  docs: defineCollection({
    loader: docsLoader(),
    schema: docsSchema({
      extend: z.object({
        document_version: z.string().regex(/^\d+\.\d+(\.\d+)?$/),
        last_updated: z.string().optional(),
        lang: z.enum(['uk']).optional(),
        applies_to: z
          .object({
            min: z.string().optional(),
          })
          .optional(),
      }),
    }),
  }),
};
```

### Step 14 — Create i18n string stubs

**`src/i18n/document-strings/en.json`:**

```json
{
  "footer.documentVersion": "Document v{version}",
  "footer.appliesTo": "Applies to SQL Cor {version}",
  "footer.lastUpdated": "Last updated {date}",
  "languageSwitcher.english": "EN",
  "languageSwitcher.ukrainian": "UK",
  "banner.olderVersion": "You are viewing docs for SQL Cor {version}. The latest version is {latest}.",
  "banner.viewLatest": "View this page in the latest version"
}
```

**`src/i18n/document-strings/uk.json`:**

```json
{
  "footer.documentVersion": "Документ v{version}",
  "footer.appliesTo": "Стосується SQL Cor {version}",
  "footer.lastUpdated": "Оновлено {date}",
  "languageSwitcher.english": "EN",
  "languageSwitcher.ukrainian": "UK",
  "banner.olderVersion": "Ви переглядаєте документацію для SQL Cor {version}. Найновіша — {latest}.",
  "banner.viewLatest": "Переглянути цю сторінку в найновішій версії"
}
```

Note: these strings are loaded **only when the document body is
shown in Ukrainian**. The site chrome stays English regardless.

### Step 15 — Write the README

Create `README.md`:

```markdown
# Opuscor SQL Cor — Documentation Site

Documentation site for SQL Cor, deployed to `sql.opuscor.com`.
Stack: Astro + Starlight with custom per-document versioning.

## Local development

\`\`\`bash
npm install
npm run dev      # http://localhost:4321/
npm run build    # → dist/
npm run preview  # serves dist/
\`\`\`

## Project structure

See `ARCHITECTURE.md` for the full picture. Key paths:

- `src/content/docs/<slug>/v{X}.md` — document content
- `src/content/docs/<slug>/_assets/v{X}/...` — images for that version
- `src/lib/product-versions.ts` — list of SQL Cor versions
- `src/pages/[version]/[...slug].astro` — dynamic router
- `src/styles/tokens.css` — design tokens

## How the router works

When you visit `/v3.0/admin-guide/`, the router:

1. Looks in `src/content/docs/admin-guide/` for `v*.md` files
2. Picks the highest version ≤ 3.0
3. Renders that file

If no version is ≤ 3.0, a 404 page appears.

## Adding a new page

Create `src/content/docs/your-new-page/v1.0.md` with frontmatter:

\`\`\`yaml
---
title: Your Page Title
description: One-line description.
sidebar:
  order: 5
document_version: "1.0"
last_updated: "2026-05-18"
---
\`\`\`

The router picks it up automatically — no config to update.

## Adding a new version of an existing document

\`\`\`bash
cp src/content/docs/user-guide/v1.0.md src/content/docs/user-guide/v3.0.md
\`\`\`

Edit the new file. Bump `document_version` in the frontmatter to
match the filename.

## Adding a new product version

Edit `src/lib/product-versions.ts` and prepend the new version:

\`\`\`ts
export const PRODUCT_VERSIONS = [
  { id: 'v2.0', label: 'v2.0', semver: '2.0.0' },
  { id: 'v1.0', label: 'v1.0', semver: '1.0.0' },
];
\`\`\`

The router will start serving `/v2.0/...` URLs immediately.

## Adding a translation

\`\`\`bash
cp src/content/docs/user-guide/v1.0.md src/content/docs/user-guide/v1.0.uk.md
\`\`\`

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
\`\`\`

### Step 16 — Update `.gitignore`

```
node_modules/
dist/
.astro/
.DS_Store
*.log
.env
.env.*
!.env.example
```

### Step 17 — Verify

Run all of:

```bash
npm install
npm run dev
# Open: http://localhost:4321/                       → should redirect to /v1.0/
# Open: http://localhost:4321/v1.0/                  → landing page with doc links
# Open: http://localhost:4321/v1.0/installation/     → installation stub
# Open: http://localhost:4321/v1.0/user-guide/       → user guide stub
# Open: http://localhost:4321/v1.0/nonexistent/      → 404 page

# Stop server, then:
npm run build
# Confirm dist/ contains:
#   dist/index.html
#   dist/404.html
#   dist/v1.0/index.html
#   dist/v1.0/installation/index.html
#   dist/v1.0/user-guide/index.html
```

---

## Acceptance criteria

A reviewer must be able to verify all of these:

1. **`npm install` completes** with no errors and installs `semver`
   and `@types/semver`.
2. **`npm run dev` starts** and prints a localhost URL.
3. **`/` redirects to `/v1.0/`** (308 status).
4. **`/v1.0/` loads** and shows the Phase 0 landing page with links
   to the stub documents.
5. **`/v1.0/installation/` loads** and shows the installation stub
   content with "ROUTER OK" indicator, document_version "1.0",
   product version "v1.0", and "UK translation available" marker.
6. **`/v1.0/user-guide/` loads** and shows the user-guide stub
   without a "UK translation available" marker.
7. **`/v1.0/nonexistent-page/` returns a 404 page** with links to
   available versions.
8. **`npm run build` completes** with no errors and produces a
   `dist/` folder with all expected HTML files.
9. **`src/lib/version-resolver.ts` has comments** explaining the
   algorithm, and the function correctly handles these test inputs:
   - `resolveDocumentVersion("v2.5", ["v1.0", "v2.0"])` returns `"v2.0"`
   - `resolveDocumentVersion("v0.9", ["v1.0", "v2.0"])` returns `null`
   - `resolveDocumentVersion("v3.0", ["v3.0"])` returns `"v3.0"`
   - `resolveDocumentVersion("v1.0", [])` returns `null`
10. **All code, comments, file names, variables, and commit messages
    are in English.** Ukrainian text appears only inside
    `*.uk.md` files and `src/i18n/document-strings/uk.json`.
11. **No hardcoded brand colors** anywhere outside `tokens.css`.
12. **The folder structure matches `ARCHITECTURE.md` section 5.**
13. **README.md exists** at the repository root with all sections
    listed in Step 15.

---

## Constraints

- **Do not migrate real SQL Cor content yet** — only the stubs from
  Step 12.
- **Do not build custom UI components yet** beyond what Step 6, 7, 8
  and 9 require — Phase 0 router pages are intentionally plain HTML.
- **Do not configure deployment** — Phase 7.
- **Do not install Tailwind, shadcn/ui, or any UI library.** We have
  our own design system.
- **Do not modify files inside `node_modules/`.**
- **Do not configure Starlight's i18n** — translations are handled
  by our custom router via query parameter, not by Starlight's
  built-in locale routing.
- **Use TypeScript strict mode** for all `.ts` files.

---

## When done

Reply with:

1. The last 20 lines of `npm run build` output.
2. The folder tree of the project (output of
   `tree -L 4 -I node_modules` or equivalent).
3. The result of these manual checks:
   - Root `/` redirects to `/v1.0/`
   - `/v1.0/installation/` shows the stub
   - `/v1.0/user-guide/` shows the stub WITHOUT a UK translation
     marker
   - `/v1.0/nonexistent-page/` returns the informative 404
4. Output of running the version resolver test inputs from
   acceptance criterion 9 (a small inline test script is fine).

If any acceptance criterion fails, list it and ask before
proceeding.
