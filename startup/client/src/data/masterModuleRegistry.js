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
 * Register the app's master definitions.
 * @param {(handleOpenMaster: function(string)) => object[]} provider
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

/**
 * Full master list: the app's registered masters + framework generics.
 * Consumers (Masters page, navigator, search, route titles, AppGuide) read this.
 *
 * @param {function(string)} handleOpenMaster - (path) => void
 */
const getMasterModules = (handleOpenMaster) => [
  ...appMasterModulesProvider(handleOpenMaster),
  ...getGenericMasterModules(handleOpenMaster),
];

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
  getMasterCategoryOrder,
};
