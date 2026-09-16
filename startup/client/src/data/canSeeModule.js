import { hasPermission } from '@utils/hasPermission';
import { getModulePermissionName } from './getModulePermissionName';

/**
 * Whether the signed-in user may see a registry entry — a master, an app module
 * or a report. One rule for all three, in one place: an entry that opts out is
 * always shown, a support-only entry needs support staff, and everything else
 * needs the permission the entry names (see getModulePermissionName).
 */
const canSeeModule = (definition, userData) => {
  if (definition.skipPermissionCheck) {
    return true;
  }
  if (definition.requireSupportUser) {
    return Boolean(userData?.isSupportUser);
  }
  return hasPermission(userData, getModulePermissionName(definition));
};

export { canSeeModule };
