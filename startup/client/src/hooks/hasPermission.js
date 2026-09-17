import { useDataContext } from '@context/useDataContext';

/**
 * Whether the user holds any of `permissionNames`.
 *
 * Pass `userData` and this is an ordinary function, usable anywhere — inside a
 * `.filter()`, in a plain module like canSeeModule, or behind a `&&`.
 *
 * Leave it out and the signed-in user is read from context, which makes this a
 * hook for that call: it may then only be called at the top level of a
 * component or another `use*` hook, and unconditionally. Behind a `&&`, or once
 * per row in a loop, React sees a different number of hooks between renders and
 * throws "Rendered fewer hooks than expected" — so those call sites pass
 * `userData` instead.
 */
const hasPermission = (permissionNames, userData) => {
  if (!userData) {
    // The rule cannot see that only this branch is a hook call; the contract
    // above is what keeps callers on the right side of it.
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const contextData = useDataContext();
    userData = contextData.userData;
  }

  if (!userData || !userData.role) {
    return false;
  }

  const userPermissions = userData.role.permissions || [];

  if (!Array.isArray(permissionNames)) {
    permissionNames = [permissionNames]; // Convert to array if it's a single string
  }

  const hasPerm = permissionNames.some((perm) =>
      userPermissions.some((userPerm) => userPerm.name === perm)
    );

  return Boolean(hasPerm);
};

export { hasPermission };
