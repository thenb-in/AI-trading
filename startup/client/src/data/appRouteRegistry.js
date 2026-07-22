let appRoutes = [];
let appRoutesWithoutSidebar = [];
let dashboardContentComponent = null;

/**
 * Register the app's extra routes that render inside the AdminLayout / sidebar.
 * @param {Array<{ path: string, element: import('react').ReactNode }>} routes
 */
const registerAppRoutes = (routes) => {
  appRoutes = Array.isArray(routes) ? routes : [];
};

/** The app-registered sidebar routes, or [] if the app registered none. */
const getAppRoutes = () => appRoutes;

/**
 * Register the app's extra routes that render WITHOUT the AdminLayout / sidebar.
 * @param {Array<{ path: string, element: import('react').ReactNode }>} routes
 */
const registerAppRoutesWithoutSidebar = (routes) => {
  appRoutesWithoutSidebar = Array.isArray(routes) ? routes : [];
};

/** The app-registered no-sidebar routes, or [] if the app registered none. */
const getAppRoutesWithoutSidebar = () => appRoutesWithoutSidebar;

/**
 * Register the app's dashboard content component (rendered at the dashboard routes).
 * @param {import('react').ComponentType} component
 */
const registerDashboardContent = (component) => {
  dashboardContentComponent = component || null;
};

/** The app-registered dashboard content component, or null if none. */
const getDashboardContent = () => dashboardContentComponent;

export {
  registerAppRoutes,
  getAppRoutes,
  registerAppRoutesWithoutSidebar,
  getAppRoutesWithoutSidebar,
  registerDashboardContent,
  getDashboardContent,
};
