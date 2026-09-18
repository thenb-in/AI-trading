import {
  getGenericMasterModules,
  genericMasterCategoryOrder,
} from './genericMasterModules';

/**
 * Registry the app layer pushes its masters into at boot.
 */
let appMasterModulesProvider = () => [];

let appMasterCategoryOrder = [];

/**
 * Register the app's master definitions: () => [{ id, title, component, ... }].
 * @param {() => object[]} provider
 */
const registerAppMasterModules = (provider) => {
  appMasterModulesProvider = typeof provider === 'function' ? provider : () => [];
};

/**
 * Register the app's master category buckets (name + display order + icon).
 * @param {{ name: string, order: number, icon?: unknown }[]} categories
 */
const registerAppMasterCategories = (categories) => {
  appMasterCategoryOrder = Array.isArray(categories) ? categories : [];
};

// A master lives at master/<path> — its id, unless the definition names a
// `path` — so opening it needs nothing more written down.
const pathOf = (definition) => definition.path ?? definition.id;

/**
 * Full master list: the app's registered masters + framework generics.
 * Consumers (Masters page, navigator, search, route titles, AppGuide) read this.
 *
 * @param {function(string)} handleOpenMaster - (path) => void
 */
const getMasterModules = (handleOpenMaster) => [
  ...appMasterModulesProvider(),
  ...getGenericMasterModules(),
].map((definition) => ({ onClick: () => handleOpenMaster(pathOf(definition)), ...definition }));

/**
 * The pages of every master that brings its `component`: master/<path>, plus
 * any `subPages` under it ({ 'edit/:id': Builder }). Each is gated on the same
 * definition that gates its card, so typing the URL is no way around it.
 */
const getMasterRoutes = () => getMasterModules(() => {})
  .filter((definition) => definition.component)
  .flatMap((definition) => [
    { path: `master/${pathOf(definition)}`, definition, component: definition.component },
    ...Object.entries(definition.subPages || {}).map(([subPath, component]) => ({
      path: `master/${pathOf(definition)}/${subPath}`, definition, component
    })),
  ]);

/**
 * All master category buckets — the app's categories + framework generics,
 * ordered by the `order` field so they interleave on the Masters page.
 */
const getMasterCategoryOrder = () =>
  [...appMasterCategoryOrder, ...genericMasterCategoryOrder].sort((a, b) => a.order - b.order);

export {
  registerAppMasterModules,
  registerAppMasterCategories,
  getMasterModules,
  getMasterRoutes,
  getMasterCategoryOrder,
};
