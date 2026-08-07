/**
 * Every keyboard shortcut the app offers, in one place — so a button's hint and
 * the handler that fires it can never drift apart.
 *
 * Shape: `{ mod?, alt?, shift?, key, alternates?, allowWhileTyping? }`
 *  - `key` is matched against `event.code` ("KeyN") or `event.key` ("Enter", "F1")
 *  - `mod` is Ctrl on Windows/Linux and Cmd on macOS
 *  - `alternates` are extra combos that trigger the same action; the first combo
 *    is the one shown to the user first
 *  - `allowWhileTyping` lets the shortcut fire from inside a text field. Off by
 *    default because Alt+letter types accented characters on a Mac.
 *
 * Debug mode (Alt+D) is deliberately absent: it stays undiscoverable, for
 * internal staff only, and is configured per company in company settings.
 */
const SHORTCUTS = {
  // Document lifecycle
  NEW: { alt: true, key: 'KeyN' },
  SAVE: { mod: true, key: 'KeyS', allowWhileTyping: true },
  CANCEL: { key: 'Escape' },
  REFRESH: { alt: true, key: 'KeyR' },
  EXPORT: { alt: true, key: 'KeyE' },
  IMPORT: { alt: true, key: 'KeyI' },

  // Navigation and views (handlers already live with the features themselves)
  APPLY_FILTERS: { alt: true, key: 'Enter', allowWhileTyping: true },
  GLOBAL_SEARCH: { alt: true, key: 'KeyS', alternates: [{ mod: true, key: 'KeyK' }] },
  HELP_SUPPORT: { alt: true, key: 'KeyH', alternates: [{ key: 'F1' }] },
  FULL_SCREEN: { alt: true, key: 'KeyF' },
};

export { SHORTCUTS };
