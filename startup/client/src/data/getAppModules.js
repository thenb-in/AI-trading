import { getAppModuleDefinitions } from '@app/data/getAppModules';

/**
 * @param {{ navigate: import('react-router-dom').NavigateFunction }} handlers
 * @param {{ hasPermissionFn: (name: string, ctx: unknown) => boolean; dataContext: unknown; userData: { isSupportUser?: boolean } | undefined }} access
 */
function getAppModuleSearchItems(handlers, access) {
  const { navigate } = handlers;
  const { hasPermissionFn, dataContext, userData } = access;

  return getAppModuleDefinitions()
    .filter((def) => isAppModuleVisible(def, { hasPermissionFn, dataContext, userData }))
    .map((def) => {
      const onSelect = () => navigate(def.navigatePath);

      return {
        type: "Module",
        title: def.title,
        description: def.description,
        category: def.category,
        tags: def.tags,
        keywords: def.keywords,
        onSelect,
      };
    });
}

function isAppModuleVisible(def, { hasPermissionFn, dataContext, userData }) {
  if (def.requireSupportUser) {
    return Boolean(userData?.isSupportUser);
  }
  if (def.skipPermissionCheck) {
    return true;
  }
  if (def.permissionName) {
    return hasPermissionFn(def.permissionName, dataContext);
  }
  return false;
}

export { getAppModuleDefinitions, getAppModuleSearchItems, isAppModuleVisible };
