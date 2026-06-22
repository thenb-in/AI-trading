import { getMasterModules, masterCategoryOrder } from '@app/data/getMasterModules';
import { getModulePermissionName } from './getModulePermissionName';

/**
 * Returns master modules that have onboarding order, sorted by onboarding (1, 2, 3...).
 * Used by AppGuide to show Department, Position, Employee steps.
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

  return [...masterCategoryOrder]
    .sort((a, b) => a.order - b.order)
    .filter(({ name }) => categoryCounts[name])
    .map(({ name }) => ({ name, count: categoryCounts[name] }));
};

const getMasterCategories = () => buildCategoryList();

/**
 * Returns only categories where the user has permission to at least one master,
 * with count = number of permitted masters in that category.
 * @param {function(string, object)} hasPermissionFn - (permissionName, dataContext) => boolean
 * @param {object} dataContext - from useDataContext()
 * @returns {Array<{ name: string, count: number }>} categories with permitted count
 */
const getMasterCategoriesForUser = (hasPermissionFn, dataContext) => {
  if (!hasPermissionFn || !dataContext) return [];
  return buildCategoryList((module) => {
    if (module.skipPermissionCheck) return true;
    return hasPermissionFn(getModulePermissionName(module), dataContext);
  });
};

export {
  getMasterModules,
  getMasterCategories,
  getMasterCategoriesForUser,
  getOnboardingMasters,
};
