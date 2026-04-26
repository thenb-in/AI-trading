import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {  FaLock, FaUser } from 'react-icons/fa';
import { toast } from 'react-toastify';
import { ApiService } from '@services/startup/ApiService';
import { useDataContext } from '@context/startup/useDataContext';
import { cleanFormData } from '@utils/startup/authformvalidation';
import { SetupTotpPopup } from './SetupTotpPopup';
import { TextTypeField } from '@base_components/fields/TextTypeField';
import { PasswordTypeField } from '@base_components/fields/PasswordTypeField';

function Login() {
  const [formData, setFormData] = useState({ username: '', password: '' });
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showTotpPopup, setShowTotpPopup] = useState(false);
  const [loginSuccessData, setLoginSuccessData] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { setUserData } = useDataContext();
  
  const handleChange = (e) => {
    const sanitizedValue = e.target.value.replace(/[<>&]/g, '');
    setFormData({ ...formData, [e.target.name]: sanitizedValue });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    // Clean form data: trim all fields and remove spaces from username and password
    const cleanedData = cleanFormData(formData);

    try {
      const response = await ApiService.login({
        username: cleanedData.username,
        password: cleanedData.password
      });

      const { user, requiresOnboarding } = response.data;
      setUserData(user);
      toast.success('Login successful!');

      // Check if TOTP is not enabled and show setup popup
      if (user.is_totp_enabled === false) {
        setLoginSuccessData({ user, cleanedData, requiresOnboarding });
        setShowTotpPopup(true);
        return;
      }

      // Check if user requires onboarding (no companyId)
      if (requiresOnboarding) {
        navigate('/onboarding', { replace: true });
        return;
      }

      // Navigate to originally requested route if available (preserve search)
      // If isSupportUser is true, default to multi-company-setup
      const redirectTo = location.state?.from || (user?.isSupportUser ? '/admin/multi-company-setup' : '/admin');
      navigate(redirectTo, { replace: true });
    } catch (err) {
      const errorData = err || {};
      const message = errorData.error || err.error || 'Login failed. Please check your credentials.';
      
      // If password change is required, redirect to forgot password page
      if (errorData.requiresPasswordChange) {
        toast.warning('Please change your password on first login');
        navigate('/forgot-password', {
          state: {
            username: cleanedData.username,
            isFirstLogin: true
          }
        });
        return;
      }

      setError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFormSubmit = (e) => {
    handleSubmit(e);
  };

  const handleForgotPasswordClick = () => {
    navigate('/forgot-password');
  };

  const handleTotpSetupSuccess = () => {
    setShowTotpPopup(false);
    // Refresh user data to get updated TOTP status
    if (loginSuccessData) {
      const { user, requiresOnboarding } = loginSuccessData;
      // Update user data with TOTP enabled
      const updatedUser = { ...user, is_totp_enabled: true };
      setUserData(updatedUser);

      // Check if user requires onboarding (no companyId)
      if (requiresOnboarding) {
        navigate('/onboarding', { replace: true });
        return;
      }

      // Navigate to originally requested route
      const redirectTo = location.state?.from || (user?.isSupportUser ? '/admin/multi-company-setup' : '/admin');
      navigate(redirectTo, { replace: true });
    }
  };

  const handleTotpPopupClose = () => {
    setShowTotpPopup(false);
    // User cancelled TOTP setup, they can still login but will be prompted again next time
    if (loginSuccessData) {
      const { user, requiresOnboarding } = loginSuccessData;
      
      // Check if user requires onboarding (no companyId)
      if (requiresOnboarding) {
        navigate('/onboarding', { replace: true });
        setLoginSuccessData(null);
        return;
      }

      const redirectTo = location.state?.from || (user?.isSupportUser ? '/admin/multi-company-setup' : '/admin');
      navigate(redirectTo, { replace: true });
    }
    setLoginSuccessData(null);
  };

  return (
    <div className="flex items-center justify-center mt-4 auth-background">
      <div className="w-full max-w-md">
        <form
         onSubmit={handleFormSubmit}

          className="bg-white shadow-2xl rounded-2xl px-8 pt-6 pb-8 mb-4 transform transition-all duration-300 hover:scale-[1.01]"
        >
          <div className="text-center mb-6">
            <h2 className="text-3xl font-bold text-gray-800 mb-2">Welcome Back</h2>
            <p className="text-gray-600">Log in to your App account</p>
          </div>

          {error && (
            <div className="mb-4 text-center">
              <p className="text-red-500 text-sm bg-red-50 py-2 rounded-lg">{error}</p>
            </div>
          )}

          {/* Username field */}
          <div className="mb-4">
            <TextTypeField
              icon={<FaUser className="text-gray-400" />}
              name="username"
              id="username"
              placeholder="Username"
              value={formData.username}
              onChange={handleChange}
              required
            />
          </div>

          {/* Password field */}
          <div className="mb-4">
            <PasswordTypeField
              icon={<FaLock className="text-gray-400" />}
              name="password"
              id="password"
              placeholder="Password"
              value={formData.password}
              onChange={handleChange}
              required
            />
          </div>

          {/* Forgot password */}
          <div className="mb-4 text-right">
            <button
              type="button"
              onClick={handleForgotPasswordClick}
              className="text-sm text-blue-600 hover:text-blue-800 hover:underline transition"
            >
              Forgot Password?
            </button>
          </div>

          {/* Submit */}
          <div className="mb-6">
            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition duration-300 transform hover:scale-[1.02] shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isLoading}
            >
              {isLoading ? 'Logging in...' : 'Log In'}
            </button>
          </div>

          {/* Signup link */}
          <div className="text-center">
            <p className="text-sm text-gray-600">
              Not registered yet?{' '}
              <button
               type="button" 
                onClick={() => navigate('/signup')}
                className="text-blue-600 hover:text-blue-800 font-semibold hover:underline transition"
              >
                Sign up
              </button>
            </p>
          </div>

          {/* Version display */}
          <div className="text-center mt-4 pt-4 border-t border-gray-200">
            <div className="flex flex-col gap-1">
              <p className="text-xs text-gray-400">
                Startup: {import.meta.env.VITE_APP_VERSION_STARTUP || '0.0.0'} | 
                Client: {import.meta.env.VITE_APP_VERSION_CLIENT || '0.0.0'} | 
                Server: {import.meta.env.VITE_APP_VERSION_SERVER || '0.0.0'}
              </p>
            </div>
          </div>
        </form>
      </div>

      {/* TOTP Setup Popup */}
      <SetupTotpPopup
        isOpen={showTotpPopup}
        onClose={handleTotpPopupClose}
        onSuccess={handleTotpSetupSuccess}
        username={loginSuccessData?.cleanedData?.username}
      />
    </div>
  );
}

export { Login };
