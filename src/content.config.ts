import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// Per-document versioned documents. Read by the custom router
// in src/pages/[version]/[...slug].astro. Starlight is not aware
// of this collection by design — see ADR-001.
const sqlcor = defineCollection({
  loader: glob({
    pattern: '**/v*.md',
    base: './src/content/sqlcor',
  }),
  schema: z.object({
    title: z.string(),
    description: z.string().min(1),
    sidebar: z
      .object({
        order: z.number().optional(),
        label: z.string().optional(),
      })
      .optional(),
    document_version: z.string().regex(/^\d+\.\d+(\.\d+)?$/),
    last_updated: z.string().optional(),
    lang: z.enum(['uk']).optional(),
    applies_to: z.object({ min: z.string().optional() }).optional(),
  }),
});

export const collections = { sqlcor };
