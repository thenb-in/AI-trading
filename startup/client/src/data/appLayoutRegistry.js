let appLayoutComponent = null;

/**
 * Register the app's global AppLayout component.
 * @param {import('react').ComponentType} component
 */
const registerAppLayout = (component) => {
  appLayoutComponent = component || null;
};

/**
 * The app-registered AppLayout, or null if the app registered none (the shell
 * renders nothing for it in that case).
 */
const getAppLayout = () => appLayoutComponent;

export { registerAppLayout, getAppLayout };
