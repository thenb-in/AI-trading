import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FaEye, FaEyeSlash, FaLock, FaArrowLeft, FaUser } from 'react-icons/fa';
import { ToastContainer, toast } from 'react-toastify';
import { ApiService } from '../../../services/startup/ApiService';
import { cleanFormData } from '../../../utils/startup/authformvalidation';

const ForgotPassword = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isFirstLogin = location.state?.isFirstLogin || false;
  const prefillUsername = location.state?.username || '';

  const [formData, setFormData] = useState({
    username: prefillUsername,
    newPassword: '',
    confirmPassword: '',
  });
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (prefillUsername) {
      setFormData(prev => ({ ...prev, username: prefillUsername }));
    }
  }, [prefillUsername]);

  const handleChange = (e) => {
    const sanitizedValue = e.target.value.replace(/[<>&]/g, '');
    setFormData({ ...formData, [e.target.name]: sanitizedValue });
  };

  const toggleNewPasswordVisibility = () => setShowNewPassword(!showNewPassword);
  const toggleConfirmPasswordVisibility = () => setShowConfirmPassword(!showConfirmPassword);

  const handlePasswordResetSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    // Clean form data: trim all fields and remove spaces from username and password
    const cleanedData = cleanFormData(formData);

    if (cleanedData.newPassword !== cleanedData.confirmPassword) {
      setError('Passwords do not match');
      setIsLoading(false);
      return;
    }

    try {
      await ApiService.request('POST', '/auth/reset-password', {
        username: cleanedData.username,
        password: cleanedData.newPassword,
        isFirstLogin: isFirstLogin || false,
      });
      toast.success('Password reset successful! Please log in.');
      setTimeout(() => navigate('/'), 1000);
    } catch (err) {
      const message = err.error || 'Unable to reset password';
      setError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-cover bg-center"
      style={{
        backgroundImage: "url('/auth.png')",
      }}
    >
      <div className="w-full max-w-md">
        <form
          onSubmit={handlePasswordResetSubmit}
          className="bg-white shadow-2xl rounded-2xl px-8 pt-6 pb-8 mb-4 transform transition-all duration-300 hover:scale-[1.01]"
        >
          <div className="text-center mb-6">
            <h2 className="text-3xl font-bold text-gray-800 mb-2">Reset Password</h2>
            <p className="text-gray-600">
              {isFirstLogin 
                ? 'Please set a new password to continue' 
                : 'Enter your username and new password'}
            </p>
            {isFirstLogin && (
              <p className="text-sm text-amber-600 mt-2 bg-amber-50 py-2 rounded-lg">
                You must reset your password before accessing the application
              </p>
            )}
          </div>

          {error && (
            <div className="mb-4 text-center">
              <p className="text-red-500 text-sm bg-red-50 py-2 rounded-lg">{error}</p>
            </div>
          )}

          {/* Username Input */}
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
                readOnly={isFirstLogin}
                className={`w-full px-3 py-2 pl-10 border border-gray-300 rounded-lg 
                           focus:outline-none focus:ring-2 focus:ring-blue-500 
                           focus:border-transparent transition duration-200
                           ${isFirstLogin ? 'bg-gray-100 cursor-not-allowed' : ''}`}
              />
            </div>
          </div>

          {/* New Password */}
          <div className="mb-4">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FaLock className="text-gray-400" />
              </div>
              <input
                type={showNewPassword ? 'text' : 'password'}
                name="newPassword"
                id="newPassword"
                placeholder="New Password"
                value={formData.newPassword}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 pl-10 border border-gray-300 rounded-lg 
                           focus:outline-none focus:ring-2 focus:ring-blue-500 
                           focus:border-transparent transition duration-200"
              />
              <button
                type="button"
                onClick={toggleNewPasswordVisibility}
                className="absolute inset-y-0 right-3 flex items-center text-gray-500 
                           hover:text-gray-700 focus:outline-none transition"
              >
                {showNewPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
          </div>

          {/* Confirm Password */}
          <div className="mb-4">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FaLock className="text-gray-400" />
              </div>
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                name="confirmPassword"
                id="confirmPassword"
                placeholder="Confirm New Password"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 pl-10 border border-gray-300 rounded-lg 
                           focus:outline-none focus:ring-2 focus:ring-blue-500 
                           focus:border-transparent transition duration-200"
              />
              <button
                type="button"
                onClick={toggleConfirmPasswordVisibility}
                className="absolute inset-y-0 right-3 flex items-center text-gray-500 
                           hover:text-gray-700 focus:outline-none transition"
              >
                {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
          </div>

          {/* Submit */}
          <div className="mb-6">
            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-3 rounded-lg 
                         hover:bg-blue-700 transition duration-300 
                         transform hover:scale-[1.02] shadow-md hover:shadow-lg 
                         disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isLoading}
            >
              {isLoading ? 'Resetting...' : 'Reset Password'}
            </button>
          </div>

          {/* Back to Login */}
          <div className="text-center">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="text-sm text-blue-600 hover:text-blue-800 hover:underline 
                         transition flex items-center justify-center gap-2"
            >
              <FaArrowLeft /> Back to Login
            </button>
          </div>
        </form>
      </div>
      <ToastContainer />
    </div>
  );
};

export { ForgotPassword };
