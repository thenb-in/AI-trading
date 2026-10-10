# App docs overlay

The product manual is built from two layers and served as one site:

- **Base (generic)** — `startup/docs/content/`. Ships with the engine; covers the
  features every app has (sign-in, navigation, lists, administration, files,
  places, announcements, search, shortcuts, troubleshooting, glossary).
- **App overlay** — `app/docs/content/` (this folder). The app's own pages.

`startup/docs/build-content.js` lays the base down first, then copies this overlay
on top, into `startup/docs/content-build` (what Docusaurus reads). So:

- A new file here (e.g. `content/payroll.md`) is **added** to the manual.
- A file here at the same path as a base file (e.g. `content/01-getting-started.md`)
  **replaces** the generic one.

## Authoring

- Markdown in `app/docs/content/`. Lean and to the point — imperatives, one idea
  per line, lists and tables over prose.
- Screenshots in `app/docs/content/images/`, referenced relatively
  (`images/x.png`, or `../images/x.png` from a nested folder).
- Order comes from each file's `sidebar_position` frontmatter. Give app pages
  positions after the base sections, or renumber a replaced base file to keep it
  in place.
- Branding (title, logo, favicon, footer, FAQ endpoint) lives in
  `app/docs/docs.app.config.js` — not in the engine.

## Run

```bash
cd startup/docs
npm install
npm run start   # serves on http://localhost:5171/docs/
```
