import { Routes, Route } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import { useEffect } from 'react';
import 'react-toastify/dist/ReactToastify.css';
import './App.css';
import { Home } from './pages/Home';
import { AdminDashboard } from './pages/AdminDashboard';
import { SignupPage } from './pages/SignupPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { OnboardingPage } from './pages/OnboardingPage';
import { AppGuide } from './pages/AppGuide';
import PropTypes from 'prop-types';
import { ProtectedRoute } from './components/ProtectedRoute';
import { GlobalSearchPalette } from './components/global_search_palette/GlobalSearchPalette';
import { consoleLogBufferService } from './utils/consoleLogBufferService';

/**
 * Root application component. Defines all top-level routes, initializes the console log
 * buffer service, and renders the global search palette and toast notification container.
 * Protected routes are wrapped with ProtectedRoute for auth enforcement.
 * @returns {JSX.Element} The complete application route tree
 */
export function App() {
  useEffect(() => {
    consoleLogBufferService.start();
  }, []);

  return (
    <>
      <GlobalSearchPalette />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route
          path="/onboarding"
          element={
            <ProtectedRoute>
              <OnboardingPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/app-guide"
          element={
            <ProtectedRoute>
              <AppGuide />
            </ProtectedRoute>
          }
        />
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
      <ToastContainer 
        position="top-right" 
        className="toast-container"
        autoClose={3000} 
        hideProgressBar={false} 
        newestOnTop={true} 
        closeOnClick 
        rtl={false}
        pauseOnFocusLoss 
        draggable 
        pauseOnHover 
        theme="light"
        // eslint-disable-next-line custom/no-inline-styles
        style={{ zIndex: 9999 }}
      />
    </>
  );
}

ProtectedRoute.propTypes = {
  children: PropTypes.node.isRequired,
};
