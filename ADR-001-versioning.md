# ADR-001: Per-document versioning

> **Status:** Accepted
> **Date:** 2026-05-18
> **Deciders:** Project owner + design partner
> **Context:** Phase 0 of the SQL Cor documentation project

---

## Context

The SQL Cor documentation site must support multiple versions of the
product (v1.0, v1.1, v2.0, v3.0, ...). Documents change at different
rates: some are stable for years (`installation`), others are
rewritten with major releases (`user-guide`).

We must choose how to organize the version history of documents in
the file system. Three options were considered.

---

## Options considered

### Option A — Version as root folder (per-site versioning)

```
src/content/docs/
├── v1.0/
│   ├── installation.md
│   ├── user-guide.md
│   └── admin-guide.md
├── v2.0/
│   ├── installation.md         (copy — unchanged)
│   ├── user-guide.md           (copy — unchanged)
│   └── admin-guide.md          (updated)
└── v3.0/
    ├── installation.md         (copy — unchanged)
    ├── user-guide.md           (updated)
    └── admin-guide.md          (copy — unchanged from v2.0)
```

**Pros:**
- Native Starlight support — zero custom routing code
- Pagefind works out of the box with per-version filtering
- Adding a new product version is a copy-paste operation
- Mental model is simple: "v3.0 docs are in `v3.0/`"

**Cons:**
- Heavy file duplication
- Fixing a typo in a stable document requires editing it in every
  version folder
- Git history is noisy — same content lives in multiple paths
- Authors see copies they did not edit when navigating the tree

### Option B — Document version in frontmatter, one file per document

```
src/content/docs/
├── installation.md       # frontmatter: document_version: 1.0, applies_to: [1.0, 1.1, 2.0, 3.0]
├── user-guide.md         # frontmatter: document_version: 3.0
└── admin-guide.md        # frontmatter: document_version: 2.0
```

History stored in git, not in the file system.

**Pros:**
- Zero duplication
- Smallest file count

**Cons:**
- Reading an old version requires checking out an old git commit —
  impossible from a static site
- Search indexes the current files; old versions are unreachable
  through search
- No way for the build to produce HTML for old versions
- **Disqualified:** does not satisfy the requirement that old
  versions remain accessible

### Option C — Per-document versioning (the chosen option)

```
src/content/docs/
├── installation/
│   ├── v1.0.md
│   └── _assets/v1.0/
├── user-guide/
│   ├── v1.0.md
│   ├── v3.0.md
│   └── _assets/{v1.0,v3.0}/
└── admin-guide/
    ├── v1.0.md
    ├── v2.0.md
    └── _assets/{v1.0,v2.0}/
```

Each document is a folder containing its own version history.
A custom router resolves a requested product version to the
correct document version (highest ≤ requested).

**Pros:**
- Zero duplication of unchanged content
- Clean git history per document
- Authoring focus — editing user-guide means seeing only user-guide
  files
- Honest version semantics — a file exists if and only if a real
  edit happened
- Naturally extends to translations (`v3.0.uk.md` next to `v3.0.md`)
- Co-located assets (`_assets/v3.0/`) keep documents self-contained

**Cons:**
- Not native to Starlight — requires custom routing (~430 LoC total
  including search-index pre-build)
- Pagefind requires a pre-build filtering step
- New authors must learn the model

---

## Decision

**We chose Option C — per-document versioning.**

The trade-off is roughly 430 lines of custom TypeScript and JavaScript
in exchange for substantially better authoring ergonomics and a
cleaner content model.

The custom code is isolated in `src/lib/` and `scripts/`, fully
typed, and does not touch Starlight internals. This keeps us
compatible with future Starlight updates.

---

## Consequences

### Positive

- Adding a new product release that changes nothing in the docs
  requires zero file system changes — the router automatically
  serves the most recent matching version.
- Editing a document is editing one file. No fan-out.
- Translations sit next to their source files. Easy to spot which
  documents have translations and which do not.
- Git diff for a content change is minimal — one file changed.

### Negative

- We own ~430 LoC of routing and search-index code. This code must
  be maintained, tested, and documented.
- New authors require an onboarding paragraph explaining the model.
- Pagefind integration is one step more involved than the default.

### Mitigations

- All custom code lives in `src/lib/` and `scripts/` with extensive
  inline comments and a top-of-file ADR reference.
- Unit tests for the version resolver cover edge cases (no versions,
  single version, future product version, semver edge cases).
- The README's "How to add a new version" section keeps the workflow
  documented at the surface.

---

## Resolution algorithm

Specified in `ARCHITECTURE.md` section 4. Summary:

```
Given a request for /vX.Y/{slug}/:
  1. List files in src/content/docs/{slug}/ matching v*.md
  2. Filter to files where file_version <= X.Y
  3. Pick the highest remaining version
  4. If none, return informative 404
```

Examples are documented in `ARCHITECTURE.md` section 4.

---

## Open issues

None at adoption time. Future revisions may add:

- Document-version badges in the sidebar
- Symlinks for shared assets between versions (currently we copy)
- A "diff this version against the latest" view (currently rejected
  as out of scope)

---

*This ADR is immutable. Future changes to the versioning model
require a new ADR (ADR-002, etc.) that supersedes this one.*
