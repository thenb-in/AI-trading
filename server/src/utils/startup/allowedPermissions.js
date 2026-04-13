const { getCurrentUser } = require('../../services/startup/authService');

/**
 * Checks if a user has at least one of the specified permissions based on their role.
 * Fetches the full user profile with role/permissions, then checks for intersection.
 * @param {string|number} userId - User ID to check
 * @param {Array<string>} permittedPermissions - List of permission names (any one grants access)
 * @returns {Promise<boolean>} True if the user has at least one of the required permissions
 */
async function allowedPermissions(userId, permittedPermissions) {
  const user = await getCurrentUser(userId);
  if (!user || !user.role || !user.role.permissions) {
    return false;
  }
  return user.role.permissions.some(permission => permittedPermissions.includes(permission.name));
}

module.exports = allowedPermissions;
