import PropTypes from 'prop-types';
import { useDataContext } from '@context/useDataContext';
import { canSeeModule } from '@data/canSeeModule';
import { getModulePermissionName } from '@data/getModulePermissionName';
import { AccessDenied } from './AccessDenied';

/**
 * A page not everyone may open. It is gated on the very definition that gates
 * its card in the navigator, so a page and its card can never disagree — and
 * typing the URL is no longer a way around either.
 */
const RequireAccess = ({ definition, children }) => {
  const { userData } = useDataContext();
  if (canSeeModule(definition, userData)) {
    return children;
  }
  return <AccessDenied requiredPermission={getModulePermissionName(definition)} />;
};

RequireAccess.propTypes = {
  definition: PropTypes.shape({
    permissionName: PropTypes.string,
    id: PropTypes.string,
    skipPermissionCheck: PropTypes.bool,
    requireSupportUser: PropTypes.bool
  }).isRequired,
  children: PropTypes.node.isRequired
};

export { RequireAccess };
