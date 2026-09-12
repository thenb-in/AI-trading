// Routes that render inside the AdminLayout / sidebar. Registered into the
// framework router by registerAppData(), so an app adds a page by dropping a
// component under src/components and listing it here:
//
//   { path: "master/widget", element: <WidgetMaster /> },
//
// Empty in the reference scaffold — the app owns no sidebar pages yet.
const appRoutes = [];

// Routes that should NOT use the AdminLayout / sidebar — standalone screens
// such as kiosk or phone-app views that render without the admin chrome.
const appRoutesWithoutSidebar = [];

// Static report pages that render at fixed slugs under /admin/report. These are
// pages that live in the report section but are not themselves reports.
const reportStaticPages = [];

export { appRoutes, appRoutesWithoutSidebar, reportStaticPages };
