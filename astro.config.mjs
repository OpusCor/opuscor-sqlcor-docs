// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

export default defineConfig({
  site: 'https://sql.opuscor.com',
  output: 'static',

  // We provide a custom informative 404 at src/pages/404.astro that
  // lists available document versions when a user requests a version
  // that does not exist. This intentionally overrides Starlight's
  // default 404. Astro emits a build warning about the duplicate
  // route — this is expected behavior, not a bug.

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
        './src/styles/global.css',
      ],

      components: {
        Head: './src/components/Head.astro',
      },

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
