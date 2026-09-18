import { getMasterModules, getMasterCategoryOrder } from './masterModuleRegistry';
import { defaultMasterCategoryIcon } from './genericMasterModules';
import { canSeeModule } from './canSeeModule';

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
};
