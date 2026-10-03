import { hasPermission } from '@startup/hooks/hasPermission';
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
  // Switching active company is open to support staff and to anyone named in a
  // group of companies — the one way a non-support user reaches the switcher.
  if (definition.requireCompanySwitchAccess) {
    return Boolean(userData?.isSupportUser || userData?.isInCompanyGroup);
  }
  return hasPermission(getModulePermissionName(definition), userData);
};

export { canSeeModule };
