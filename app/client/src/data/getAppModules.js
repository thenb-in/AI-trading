import { getGenericAppModuleDefinitions } from "@startup/data/getAppModules";

/**
 * App-specific modules (sidebar / top nav): searchable alongside masters and
 * reports. Apps register their own product modules here — each entry is a
 * definition object like the generic ones in `getGenericAppModuleDefinitions`,
 * e.g.:
 *
 *   {
 *     id: "myModule",
 *     title: "My Module",
 *     description: "...",
 *     category: "...",
 *     color: "teal",
 *     tags: ["..."],
 *     keywords: "...",
 *     permissionName: "view_my_module",   // or skipPermissionCheck / requireSupportUser
 *     navigatePath: "/admin/my-module",
 *     icon: SomeLucideIcon,
 *     order: 3,                            // interleaves with generic modules by `order`
 *   }
 *
 * Empty in the reference scaffold — product modules are app customizations.
 */
const getAppSpecificModuleDefinitions = () => [];

/**
 * Full app module list: framework generics + this app's product modules,
 * ordered by the `order` field so they interleave in the sidebar / navigator.
 * Consumers (sidebar, navigator, search, route titles) read this.
 */
const getAppModuleDefinitions = () =>
  [...getGenericAppModuleDefinitions(), ...getAppSpecificModuleDefinitions()].sort(
    (a, b) => a.order - b.order
  );

export { getAppModuleDefinitions, getAppSpecificModuleDefinitions };
