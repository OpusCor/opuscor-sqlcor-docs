// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import remarkDirective from 'remark-directive';
import { remarkOpuscorCallouts } from './src/lib/remark-opuscor-callouts';
import { remarkImagePlaceholders } from './src/lib/remark-image-placeholders';

/**
 * Astro integration that appends Opuscor's remark plugins AFTER
 * Starlight has registered its own, so Starlight cannot overwrite
 * them.
 *
 * @returns {import('astro').AstroIntegration}
 */
function opuscorMarkdown() {
  return {
    name: 'opuscor-markdown',
    hooks: {
      'astro:config:setup': ({ config, updateConfig }) => {
        const existing = config.markdown?.remarkPlugins ?? [];
        updateConfig({
          markdown: {
            remarkPlugins: [
              ...existing,
              remarkDirective,
              remarkOpuscorCallouts,
              remarkImagePlaceholders,
            ],
          },
        });
      },
    },
  };
}

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

      // en + uk locales. English uses `root` so /v1.0/... URLs stay unprefixed.
      // Ukrainian content is served via ?lang=uk (custom router + LanguageSelect).
      // UI overrides (e.g. English pagination on uk pages): src/content/i18n/uk.json
      defaultLocale: 'root',
      locales: {
        root: {
          label: 'English',
          lang: 'en',
        },
        uk: {
          label: 'Українська',
          lang: 'uk',
        },
      },
      // Keep pagination labels in English for `uk` via src/content/i18n/uk.json.
      // Starlight uses Unicode-safe heading slugs, so Cyrillic IDs stay intact.
      // No extra slug config is required; TOC tracking is handled via CSS offsets.

      pagination: true,

      routeMiddleware: './src/starlight-route-middleware.ts',

      customCss: [
        './src/styles/tokens.css',
        './src/styles/starlight-overrides.css',
        './src/styles/global.css',
      ],

      components: {
        Head: './src/components/Head.astro',
        SiteTitle: './src/components/SiteTitle.astro',
        Sidebar: './src/components/Sidebar.astro',
        MobileTableOfContents: './src/components/MobileTableOfContents.astro',
        Search: './src/components/Search.astro',
        LanguageSelect: './src/components/LanguageSelect.astro',
        Footer: './src/components/Footer.astro',
      },

      sidebar: [
        {
          label: 'Getting Started',
          items: [
            { label: 'Installation', link: '/v1.0/installation/' },
          ],
        },
        {
          label: 'Using SQL Cor',
          items: [
            { label: 'User Guide', link: '/v1.0/user-guide/' },
            { label: 'Admin Guide', link: '/v1.0/admin-guide/' },
          ],
        },
        {
          label: 'Reference',
          items: [
            { label: 'Feature Reference', link: '/v1.0/reference/features/' },
            { label: 'Message Reference', link: '/v1.0/reference/messages/' },
            { label: 'Keyboard Shortcuts', link: '/v1.0/reference/shortcuts/' },
          ],
        },
        {
          label: 'Help',
          items: [
            { label: 'Troubleshooting', link: '/v1.0/troubleshooting/' },
          ],
        },
      ],

      social: [
        {
          icon: 'github',
          label: 'GitHub',
          href: 'https://github.com/OpusCor/SQL',
        },
      ],
    }),
    opuscorMarkdown(),
  ],
});
