import { useDataContext } from '@context/useDataContext';
import { useLocation } from 'react-router-dom';
import { Navigate } from 'react-router-dom';
import PropTypes from 'prop-types';

function ProtectedRoute({ children }) {
    const { userData } = useDataContext();
    const location = useLocation();

    if (!userData) return <Navigate to="/" replace state={{ from: location }} />;

    // Only MANAGED SSO accounts
    if (userData.ssoManaged && location.pathname !== '/usermanagement') {
        return <Navigate to="/usermanagement" replace />;
    }
    return children;
}

ProtectedRoute.propTypes = {
    children: PropTypes.node.isRequired,
};

export { ProtectedRoute };