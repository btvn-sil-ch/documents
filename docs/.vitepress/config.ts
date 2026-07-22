import { defineConfig } from 'vitepress';

export default defineConfig({
  title: 'BioTuring Library',
  description: 'Documentation for the JavaScript library',
  base: '/',
  cleanUrls: true,
  ignoreDeadLinks: true,

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
          items: [{ text: 'Overview', link: '/zavier/' }],
        },
      ],
    },

    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2026 BioTuring',
    },
  },
});
