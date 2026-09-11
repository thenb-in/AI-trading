import { useDataContext } from '@context/useDataContext';
import { hasPermission } from '@utils/hasPermission';

/**
 * True when the logged-in user's role grants `permissionName`.
 */
const usePermission = (permissionName) => {
  const { userData } = useDataContext();
  return Boolean(userData && hasPermission(userData, permissionName));
};

export { usePermission };
