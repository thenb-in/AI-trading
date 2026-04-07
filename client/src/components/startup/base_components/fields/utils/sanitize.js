/**
 * Minimal sanitization used across the app.
 * Opt-in via `sanitize` prop because some textareas (logs/descriptions) may need symbols.
 */

function basicSanitize(value) {
  return String(value ?? '').replace(/[<>&]/g, '');
}

export { basicSanitize };


