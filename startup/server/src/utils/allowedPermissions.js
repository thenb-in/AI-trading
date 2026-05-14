const { getCurrentUser } = require('../services/authService');

async function allowedPermissions(userId, permittedPermissions) {
  const user = await getCurrentUser(userId);
  if (!user || !user.role || !user.role.permissions) {
    return false;
  }
  return user.role.permissions.some(permission => permittedPermissions.includes(permission.name));
}

module.exports = allowedPermissions;
