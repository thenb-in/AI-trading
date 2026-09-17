import { getMasterModules, getMasterCategoryOrder } from './masterModuleRegistry';
import { defaultMasterCategoryIcon } from './genericMasterModules';
import { canSeeModule } from './canSeeModule';

/**
 * Returns master modules that have onboarding order, sorted by onboarding (1, 2, 3...).
 * Used by AppGuide to walk someone through an app's masters in setup order.
 * @param {function(string)} handleOpenMaster - (path) => void, e.g. navigate to /admin/master/{path}
 */
const getOnboardingMasters = (handleOpenMaster) => {
  const all = getMasterModules(handleOpenMaster);
  return all
    .filter((m) => m.onboarding != null)
    .sort((a, b) => a.onboarding - b.onboarding);
};

const buildCategoryList = (predicate = () => true) => {
  const categoryCounts = {};

  getMasterModules(() => { }).forEach((module) => {
    if (!predicate(module)) return;
    const category = module.category || "Uncategorized";
    categoryCounts[category] = (categoryCounts[category] || 0) + 1;
  });

  return getMasterCategoryOrder()
    .filter(({ name }) => categoryCounts[name])
    .map(({ name }) => ({ name, count: categoryCounts[name] }));
};

const getMasterCategories = () => buildCategoryList();

/**
 * Only the categories holding at least one master this user may see, counting
 * just those masters.
 */
const getMasterCategoriesForUser = (userData) =>
  buildCategoryList((module) => canSeeModule(module, userData));

export {
  getMasterModules,
  getMasterCategoryOrder,
  defaultMasterCategoryIcon,
  getMasterCategories,
  getMasterCategoriesForUser,
  getOnboardingMasters,
};
