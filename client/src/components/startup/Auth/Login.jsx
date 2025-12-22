import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FaEye, FaEyeSlash, FaLock, FaUser } from 'react-icons/fa';
import { toast } from 'react-toastify';
import { ApiService } from '../../../services/startup/ApiService';
import { useDataContext } from '../../../context/startup/useDataContext';
import { cleanFormData } from '../../../utils/startup/authformvalidation';

function Login() {
  const [formData, setFormData] = useState({ username: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
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
      
      const { user } = response.data;
      setUserData(user);
      toast.success('Login successful!');

      // Navigate to originally requested route if available (preserve search)
      // If isSadmin is true, default to multi-company-setup
      const redirectTo = location.state?.from || (user?.isSadmin ? '/admin/multi-company-setup' : '/admin');
      navigate(redirectTo, { replace: true });
    } catch (err) {
      const errorData = err || {};
      console.log('Error Data:', errorData);
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

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const handleFormSubmit = (e) => {
    handleSubmit(e);
  };

  const handleForgotPasswordClick = () => {
    navigate('/forgot-password');
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
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FaUser className="text-gray-400" />
              </div>
              <input
                type="text"
                name="username"
                id="username"
                placeholder="Username"
                value={formData.username}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200"
              />
            </div>
          </div>

          {/* Password field */}
          <div className="mb-4">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FaLock className="text-gray-400" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                id="password"
                placeholder="Password"
                value={formData.password}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200"
              />
              <button
                type="button"
                onClick={togglePasswordVisibility}
                className="absolute inset-y-0 right-3 flex items-center text-gray-500 hover:text-gray-700 transition"
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
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
    </div>
  );
}

export { Login };
