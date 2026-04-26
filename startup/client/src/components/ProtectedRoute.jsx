import { useDataContext } from '../context/useDataContext';
import { useLocation } from 'react-router-dom';
import { Navigate } from 'react-router-dom';
import PropTypes from 'prop-types';

/**
 * Route wrapper that redirects unauthenticated users to the login page.
 * Shows nothing while auth state is loading; redirects with location state for post-login return.
 * @param {{ children: React.ReactNode }} props
 * @returns {React.ReactNode|null} Children if authenticated, Navigate to "/" if not, null while loading
 */
function ProtectedRoute({ children }) {
    const { userData, loading } = useDataContext();
    const location = useLocation();

    // Wait for auth 
    if (loading) return null;

    if (!userData) return <Navigate to="/" replace state={{ from: location }} />;
    return children;
}

ProtectedRoute.propTypes = {
    children: PropTypes.node.isRequired,
};

export { ProtectedRoute };