import { getAppModuleDefinitions } from './appModuleRegistry';
import { getGenericAppModuleDefinitions } from './genericAppModules';
import { canSeeModule } from './canSeeModule';


function getAppModuleSearchItems({ navigate }, userData) {
  return getAppModuleDefinitions()
    .filter((def) => canSeeModule(def, userData))
    .map((def) => ({
      type: "Module",
      title: def.title,
      description: def.description,
      category: def.category,
      tags: def.tags,
      keywords: def.keywords,
      onSelect: () => navigate(def.navigatePath),
    }));
}

export {
  getAppModuleDefinitions,
  getGenericAppModuleDefinitions,
  getAppModuleSearchItems,
};
