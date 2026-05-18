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
