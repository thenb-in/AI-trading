export const hasPermission = (userData, permissionNames) => {
  const userPermissions = userData?.role?.permissions || [];

  if (!Array.isArray(permissionNames)) {
    permissionNames = [permissionNames]; // Convert to array if it's a single string
  }

  return permissionNames.some((perm) =>
    userPermissions.some((userPerm) => userPerm.name === perm)
  );
};