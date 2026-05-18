import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';
import { docsLoader } from '@astrojs/starlight/loaders';
import { docsSchema } from '@astrojs/starlight/schema';

// Starlight requires a `docs` collection to exist. We keep it empty
// — Starlight will not generate any pages from it because there are
// no files to load.
const docs = defineCollection({
  loader: docsLoader(),
  schema: docsSchema(),
});

// Our per-document versioned documents live here. Starlight does not
// know about this collection, so it cannot generate routes from it.
// The custom router in src/pages/[version]/[...slug].astro reads
// these files directly and serves them under /vX.Y/<slug>/ URLs.
const sqlcor = defineCollection({
  loader: glob({
    pattern: '**/v*.md',
    base: './src/content/sqlcor',
  }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    sidebar: z
      .object({
        order: z.number().optional(),
        label: z.string().optional(),
      })
      .optional(),
    document_version: z.string().regex(/^\d+\.\d+(\.\d+)?$/),
    last_updated: z.string().optional(),
    lang: z.enum(['uk']).optional(),
    applies_to: z
      .object({
        min: z.string().optional(),
      })
      .optional(),
  }),
});

export const collections = { docs, sqlcor };
