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
      "--grid-header-fg": "#ffffff",
      "--grid-header-icon": "#e2e8f0",
      "--grid-header-icon-muted": "rgba(255,255,255,0.6)",
      "--grid-header-icon-sorted": "#93c5fd",
      "--grid-header-font-weight": "700",
      "--grid-header-letter-spacing": "0.05em",
      "--grid-header-text-transform": "uppercase",
      "--grid-header-border-bottom-width": "3px",
      "--grid-header-border-right-width": "2px",
      "--grid-cell-border-bottom": "2px solid #d1d5db",
      "--grid-cell-border-right": "2px solid #e5e7eb",
      "--grid-pin-border": "rgba(255,255,255,0.2)",
      "--grid-total-border": "#2563eb",
      "--grid-toggle-fg": "#1e40af",
      "--grid-container-radius": "12px",
      "--grid-container-shadow":
        "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
      "--grid-container-border": "1px solid #e2e8f0",
    },
  },
  // Quiet gray table look (matches the older MasterTable UI).
  // Horizontal row rules only — no vertical cell borders (avoids the boxy grid).
  master: {
    id: "master",
    label: "Master",
    short: "O",
    vars: {
      "--grid-row-even": "#ffffff",
      "--grid-row-odd": "#ffffff",
      "--grid-row-selected": "#eff6ff",
      "--grid-row-selected-accent": "#3b82f6",
      "--grid-header-bg": "#f9fafb",
      "--grid-header-bg-sorted": "#f3f4f6",
      "--grid-header-border": "#e5e7eb",
      "--grid-header-border-soft": "transparent",
      "--grid-header-border-sorted": "#d1d5db",
      "--grid-header-fg": "#6b7280",
      "--grid-header-icon": "#9ca3af",
      "--grid-header-icon-muted": "#9ca3af",
      "--grid-header-icon-sorted": "#3b82f6",
      "--grid-header-font-weight": "500",
      "--grid-header-letter-spacing": "normal",
      "--grid-header-text-transform": "none",
      "--grid-header-border-bottom-width": "1px",
      "--grid-header-border-right-width": "0px",
      "--grid-cell-border-bottom": "1px solid #e5e7eb",
      "--grid-cell-border-right": "none",
      "--grid-pin-border": "rgba(107, 114, 128, 0.25)",
      "--grid-total-border": "#e5e7eb",
      "--grid-toggle-fg": "#4b5563",
      "--grid-container-radius": "0px",
      "--grid-container-shadow": "none",
      "--grid-container-border": "1px solid #e5e7eb",
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
