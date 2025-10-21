import { Routes, Route, useLocation } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useDataContext } from "./context/startup/useDataContext";
import Home from './pages/startup/Home';
import AdminDashboard from './pages/startup/AdminDashboard';
import SignupPage from './pages/startup/SignupPage';
import ForgotPasswordPage from './pages/startup/ForgotPasswordPage';
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

export default function App() {
  return (
    <>
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
      <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} newestOnTop={false} closeOnClick pauseOnFocusLoss draggable pauseOnHover />
    </>
  );
}

ProtectedRoute.propTypes = {
  children: PropTypes.node.isRequired,
};
