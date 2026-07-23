import { defineConfig } from 'vitepress';
import { withMermaid } from 'vitepress-plugin-mermaid';

export default withMermaid(
  defineConfig({
    title: 'BioTuring Library',
    description: 'Documentation for the JavaScript library',
    base: '/documents/',
    cleanUrls: true,
    ignoreDeadLinks: true,

    // Mermaid — fenced ```mermaid blocks render as diagrams via
    // vitepress-plugin-mermaid. The plugin's <Mermaid> component auto-applies
    // the 'dark' theme when the `.dark` class is present on <html>.
    mermaid: {},

    vite: {
      optimizeDeps: {
        include: ['dayjs', 'mermaid', '@braintree/sanitize-url'],
      },
      build: {
        commonjsOptions: {
          include: [/node_modules/],
        },
      },
    },

    themeConfig: {
      nav: [
        { text: 'Home', link: '/' },
        { text: 'upload-svc', link: '/upload-svc/' },
        { text: 'zavier', link: '/zavier/' },
      ],

      sidebar: {
        '/upload-svc/': [
          {
            text: '@bioturing-org/upload-svc',
            items: [{ text: 'Overview', link: '/upload-svc/' }],
          },
        ],
        '/zavier/': [
          {
            text: '@bioturing-org/zavier',
            items: [
              { text: 'Overview', link: '/zavier/' },
              { text: 'Getting started', link: '/zavier/getting-started' },
              { text: 'React hooks', link: '/zavier/react-hooks' },
            ],
          },
          {
            text: 'Layers',
            items: [
              { text: 'Zarr image', link: '/zavier/layers/zarr-image' },
              { text: 'ScatterplotShape', link: '/zavier/layers/scatter-plot-shape' },
              { text: 'Polygon', link: '/zavier/layers/polygon' },
              { text: 'Capped line', link: '/zavier/layers/capped-line' },
              { text: 'Shape marker', link: '/zavier/layers/shape-marker' },
            ],
          },
        ],
      },

      footer: {
        message: 'Released under the MIT License.',
        copyright: 'Copyright © 2026 BioTuring',
      },
    },
  }),
);
