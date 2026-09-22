import { useDataContext } from '@context/useDataContext';

/**
 * Whether the user holds any of `permissionNames`, or — given `{ all: [...] }` —
 * every one of them.
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
 *
 * Only leaving the argument out reads the context. A `userData` that is passed
 * but empty — signed out, or the session just expired — holds no permissions;
 * reading the context there would be a hook call inside the caller's callback.
 */
const hasPermission = (permissionNames, ...given) => {
  // The rule cannot see that only this branch is a hook call; the contract
  // above is what keeps callers on the right side of it.
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const userData = given.length ? given[0] : useDataContext().userData;

  if (!userData || !userData.role) {
    return false;
  }

  const userPermissions = userData.role.permissions || [];

  const holds = (name) => userPermissions.some((permission) => permission.name === name);

  const holds = (name) => userPermissions.some((permission) => permission.name === name);

  // { all: [...] } — every one of them, for a master that spans two others: a
  // department position is an assignment linking a department to a position, so
  // acting on one needs the right on both, not either.
  if (permissionNames?.all) {
    return permissionNames.all.every(holds);
  }

  const names = Array.isArray(permissionNames) ? permissionNames : [permissionNames];
  return names.some(holds);
};

export { hasPermission };
