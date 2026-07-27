import { useDataContext } from '@context/useDataContext';
import { useLocation } from 'react-router-dom';
import { Navigate } from 'react-router-dom';
import { CircularLoadingBar } from '@utils/CircularLoadingBar';
import PropTypes from 'prop-types';

function ProtectedRoute({ children }) {
    const { userData, loading } = useDataContext();
    const location = useLocation();

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[200px] gap-2">
                <CircularLoadingBar />
                <p className="text-xs text-gray-600">Loading...</p>
            </div>
        );
    }

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