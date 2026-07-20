import { Routes, Route } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import { useEffect } from 'react';
import 'react-toastify/dist/ReactToastify.css';
import './App.css';
import { Home } from './pages/Home';
import { AdminDashboard } from './pages/AdminDashboard';
import { NotFound } from './pages/NotFound';
import { SignupPage } from './pages/SignupPage';
import { GetStartedPage } from './pages/GetStartedPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { SsoLoginPage } from './pages/SsoLoginPage';
import PropTypes from 'prop-types';
import { ProtectedRoute } from './components/ProtectedRoute';
import { GlobalSearchPalette } from './components/global_search_palette/GlobalSearchPalette';
import { consoleLogBufferService } from './utils/consoleLogBufferService';
import { PWAInstallPrompt } from './seo/PWAInstallPrompt';
import { RouteTitle } from './seo/RouteTitle';
import { useSso } from './hooks/useSso';

export function App() {
  useSso();

  useEffect(() => {
    consoleLogBufferService.start();
  }, []);

  return (
    <>
     {/* Per-route <title>. Renders before the per-page <PageMeta> in
         landing/auth pages so those still win on /, /signup, etc.; on
         authed routes (which have no PageMeta of their own) this is the
         only Helmet active, so the tab title reflects the current page. */}
     <RouteTitle />
     <PWAInstallPrompt />
      <GlobalSearchPalette />
      <Routes>
        <Route path="/" element={<SsoLoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/get-started" element={<GetStartedPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        {/* Straight to Wallet — signing up and resetting happen on its screens. */}
        <Route path="/login" element={<Home />} />
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
        <Route path="*" element={<NotFound />} />
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
      />
    </>
  );
}

ProtectedRoute.propTypes = {
  children: PropTypes.node.isRequired,
};
