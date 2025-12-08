import { useDataContext } from '../../context/startup/useDataContext';
import { useLocation } from 'react-router-dom';
import { Navigate } from 'react-router-dom';
import PropTypes from 'prop-types';

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