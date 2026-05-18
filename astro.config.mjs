// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import remarkDirective from 'remark-directive';
import { remarkOpuscorCallouts } from './src/lib/remark-opuscor-callouts';

/** Append Opuscor remark plugins after Starlight's own markdown setup. */
function opuscorMarkdown() {
  return {
    name: 'opuscor-markdown',
    hooks: {
      'astro:config:setup': ({ config, updateConfig }) => {
        const existing = config.markdown?.remarkPlugins ?? [];
        updateConfig({
          markdown: {
            remarkPlugins: [...existing, remarkDirective, remarkOpuscorCallouts],
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

      customCss: [
        './src/styles/tokens.css',
        './src/styles/starlight-overrides.css',
        './src/styles/global.css',
      ],

      components: {
        Head: './src/components/Head.astro',
        SiteTitle: './src/components/SiteTitle.astro',
      },

      sidebar: [
        {
          label: 'Documentation',
          items: [
            { label: 'Overview', link: '/v1.0/' },
            { label: 'Installation', link: '/v1.0/installation/' },
            { label: 'User Guide', link: '/v1.0/user-guide/' },
          ],
        },
      ],

      social: [],
    }),
    opuscorMarkdown(),
  ],
});
