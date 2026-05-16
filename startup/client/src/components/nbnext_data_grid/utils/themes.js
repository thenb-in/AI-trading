/**
 * Theme tokens for NbNextDataGrid.
 *
 * Each theme is a bundle of CSS custom properties that get applied to the
 * grid's container element. Component styles read them via `var(--token)`,
 * so adding a new theme = adding one more entry here. No component changes.
 */

const themes = {
  report: {
    id: "report",
    label: "Report",
    short: "B",
    vars: {
      "--grid-row-even": "#ffffff",
      "--grid-row-odd": "#eff6ff",
      "--grid-row-selected": "#dbeafe",
      "--grid-row-selected-accent": "#2563eb",
      "--grid-header-bg": "#1e40af",
      "--grid-header-bg-sorted": "#1e3a8a",
      "--grid-header-border": "#3b82f6",
      "--grid-header-border-soft": "rgba(59, 130, 246, 0.3)",
      "--grid-header-border-sorted": "#60a5fa",
      "--grid-total-border": "#2563eb",
      "--grid-toggle-fg": "#1e40af",
    },
  },
  master: {
    id: "master",
    label: "Master",
    short: "O",
    vars: {
      "--grid-row-even": "#ffffff",
      "--grid-row-odd": "#fff7ed",
      "--grid-row-selected": "#ffedd5",
      "--grid-row-selected-accent": "#ea580c",
      "--grid-header-bg": "#c2410c",
      "--grid-header-bg-sorted": "#9a3412",
      "--grid-header-border": "#f97316",
      "--grid-header-border-soft": "rgba(249, 115, 22, 0.3)",
      "--grid-header-border-sorted": "#fb923c",
      "--grid-total-border": "#ea580c",
      "--grid-toggle-fg": "#c2410c",
    },
  },
};

const DEFAULT_THEME_ID = "report";

const getTheme = (id) => themes[id] ?? themes[DEFAULT_THEME_ID];

const getNextThemeId = (currentId) => {
  const ids = Object.keys(themes);
  const idx = ids.indexOf(currentId);
  return ids[(idx + 1) % ids.length];
};

export { themes, getTheme, getNextThemeId, DEFAULT_THEME_ID };
