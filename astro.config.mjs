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
