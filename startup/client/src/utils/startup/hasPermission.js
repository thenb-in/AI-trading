/**
 * Checks if the current user has at least one of the specified permissions.
 * Used by frontend components to conditionally render features based on RBAC.
 * @param {Object} userData - User object from DataContext (must have role.permissions array)
 * @param {string|Array<string>} permissionNames - Permission name(s) to check
 * @returns {boolean} True if the user has at least one matching permission
 */
const hasPermission = (userData, permissionNames) => {
    const userPermissions = userData?.role?.permissions || [];
  
    if (!Array.isArray(permissionNames)) {
      permissionNames = [permissionNames]; // Convert to array if it's a single string
    }
  
    return permissionNames.some((perm) =>
      userPermissions.some((userPerm) => userPerm.name === perm)
    );
  };

export { hasPermission };