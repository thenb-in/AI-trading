// Common docs ENGINE. This file is deliberately content-free: it reads every
// app-specific setting from app/docs/docs.app.config.js. The manual it serves is
// built from two layers — the generic base in startup/docs/content and the app's
// own pages in app/docs/content — merged into content-build by build-content.js.
// A different app drops in its own app/docs/ and reuses this engine untouched.
const path = require('path');
const app = require('../../app/docs/docs.app.config.js');
const { buildMergedContent } = require('./build-content.js');

// Merge base + app pages on every start/build, so the served manual is always
// current no matter how the engine was invoked.
const CONTENT_DIR = buildMergedContent();
// App branding/chrome (logo, favicon) lives here. Content images are referenced
// relatively and bundled by webpack, so they are NOT served from here.
const APP_STATIC_DIR = path.resolve(__dirname, '../../app/docs/static');

/** @type {import('@docusaurus/types').Config} */
module.exports = {
  title: app.title,
  tagline: app.tagline,
  url: app.url,
  baseUrl: app.baseUrl,
  favicon: app.favicon,
  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'throw',
  onBrokenAnchors: 'throw',
  // Engine's own static dir + the app's branding assets (logo, favicon).
  staticDirectories: ['static', APP_STATIC_DIR],
  presets: [
    [
      'classic',
      {
        docs: {
          path: CONTENT_DIR,
          routeBasePath: app.routeBasePath,
          sidebarPath: require.resolve('./sidebars.js'),
        },
        blog: false,
        theme: { customCss: require.resolve('./src/css/custom.css') },
      },
    ],
  ],
  themes: [
    [
      '@easyops-cn/docusaurus-search-local',
      {
        hashed: true,
        indexDocs: true,
        indexBlog: false,
        docsRouteBasePath: app.routeBasePath,
      },
    ],
  ],
  themeConfig: {
    navbar: {
      title: app.title,
      logo: { alt: app.title, src: app.logo },
    },
    footer: { style: 'dark', copyright: app.footer },
  },
  // Exposed to the FAQ chatbox widget via useDocusaurusContext().
  customFields: { faqApiUrl: app.faqApiUrl },
};
