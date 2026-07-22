import type { Theme } from 'vitepress';
import Layout from './Layout.vue';
import './custom.css';

export default {
  Layout,
  enhanceApp({ app, router, siteData }) {
    // Custom theme entry point.
    // Add global components, plugins, or app-level enhancements here.
  },
} satisfies Theme;
