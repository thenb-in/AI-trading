// App-specific configuration for the product manual. The docs engine
// (startup/docs/docusaurus.config.js) is content-free and reads everything it
// needs from here: title, branding, routing, and where the FAQ chatbox talks to.
// An app built on this base overrides these values and adds its own pages under
// app/docs/content — those are merged on top of the generic manual.
module.exports = {
  title: 'AI Trading — User Manual',
  tagline: 'Set up the broker, read the signals, run the desk',

  // Production origin the manual is served from, used for the sitemap and
  // absolute links. The manual ships inside the client bundle and nginx serves
  // it under /docs/ (see deploy/base.conf), so baseUrl is /docs/.
  url: process.env.DOCS_SITE_URL || 'http://localhost:5171',
  baseUrl: '/docs/',

  // Branding assets resolve against app/docs/static/. Replace logo.svg with the
  // app's own mark; favicon can reuse it.
  logo: 'img/logo.svg',
  favicon: 'img/logo.svg',

  // routeBasePath '/' means content/getting-started.md serves at /docs/getting-started
  // (baseUrl already namespaces everything under /docs/).
  routeBasePath: '/',

  footer: `© ${new Date().getFullYear()} User Manual`,

  // Consumed by the FAQ chatbox widget via useDocusaurusContext(). Points at the
  // app's FAQ API; harmless until the widget ships.
  faqApiUrl: process.env.DOCS_FAQ_API_URL || '/api/v1/faq',
};
