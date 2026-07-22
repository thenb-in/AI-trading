/**
 * Registry the app layer plugs its Company Profile settings panel into at boot.
 * The panel is app-owned (compliance/attendance rules etc.), but it is embedded
 * inside the startup-owned Company Settings shell. Startup must never import
 * @app directly, so the app registers the component here and the shell reads it.
 */
let companyProfileSettingsComponent = null;

/**
 * Register the app's Company Profile settings panel.
 * @param {import('react').ComponentType} component - forwardRef component
 *   exposing { save, isDirty, reset } via its ref.
 */
const registerCompanyProfileSettings = (component) => {
  companyProfileSettingsComponent = component || null;
};

/**
 * The app-registered Company Profile panel, or null if the app never
 * registered one (the shell renders nothing for the profile tab in that case).
 */
const getCompanyProfileSettings = () => companyProfileSettingsComponent;

export { registerCompanyProfileSettings, getCompanyProfileSettings };
