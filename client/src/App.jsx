import { Routes, Route } from 'react-router-dom';
import { useDataContext } from "./context/useDataContext";
import Home from './pages/Home';
import AdminDashboard from './pages/AdminDashboard';
import SignupPage from './pages/SignupPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import { Navigate } from 'react-router-dom';
import PropTypes from 'prop-types';

function ProtectedRoute({ children }) {
  const { userData } = useDataContext();
  console.log('check userData from protected Route function', userData);
  if (!userData) return <Navigate to="/" />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route
        path="/user-routes"
        element={
          <ProtectedRoute>
           <div>
            Implement app logic here. This is normal user routes.
           </div>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/*"
        element={
          <ProtectedRoute>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

ProtectedRoute.propTypes = {
  children: PropTypes.node.isRequired,
};
