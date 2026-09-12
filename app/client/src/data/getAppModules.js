/**
 * App modules 
 *
 * Each entry looks like:
 *   {
 *     id: "myDashboard",
 *     title: "My Dashboard",
 *     description: "What the page is for.",
 *     category: "Administration",
 *     color: "blue",                       // ModuleCard accent
 *     tags: ["Dashboard"],
 *     keywords: "dashboard overview module",
 *     permissionName: "view_my_dashboard_module",
 *     navigatePath: "/admin/my-dashboard", // must match a route in getAppRoutes.jsx
 *     icon: SomeLucideIcon,
 *     order: 1,                            // sidebar order
 *   }
 *
 */
const getAppSpecificModuleDefinitions = () => [];

export { getAppSpecificModuleDefinitions };
