async function allowedPermissions(userId, permittedPermissions) {
  // Lazy require to avoid circular dependency issues
  const { getCurrentUser } = require('../services/authService');
  const user = await getCurrentUser(userId);
  if (!user || !user.role || !user.role.permissions) {
    return false;
  }
  return user.role.permissions.some(permission => permittedPermissions.includes(permission.name));
}

module.exports = allowedPermissions;
