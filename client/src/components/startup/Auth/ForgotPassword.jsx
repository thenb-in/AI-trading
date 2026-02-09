import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {  FaLock, FaArrowLeft, FaUser } from 'react-icons/fa';
import { toast } from 'react-toastify';
import { ApiService } from '@services/startup/ApiService';
import { cleanFormData } from '@utils/startup/authformvalidation';
import { TextField } from '@startup/safe_choice';

const ForgotPassword = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isFirstLogin = location.state?.isFirstLogin || false;
  const prefillUsername = location.state?.username || '';

  const [formData, setFormData] = useState({
    username: prefillUsername,
    newPassword: '',
    confirmPassword: '',
    otp: '',
  });
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

  const handleOtpChange = (e) => {
    setFormData({ ...formData, otp: e.target.value });
  };

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
        otp: !isFirstLogin ? formData.otp : undefined,
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
    <div className="min-h-screen flex items-center justify-center auth-background">
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
                : 'Enter your username, new password, and Google Authenticator code'}
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
            <TextField
            icon={ <FaUser className="text-gray-400" />}
              type="text"
              name="username"
              id="username"
              placeholder="Username"
              value={formData.username}
              onChange={handleChange}
              required
              disabled={isFirstLogin}
            />
          </div>

          {/* New Password */}
          <div className="mb-4">
            <TextField
            icon={  <FaLock className="text-gray-400" />}
              type="password"
              name="newPassword"
              id="newPassword"
              placeholder="New Password"
              value={formData.newPassword}
              onChange={handleChange}
              required
            />
          </div>

          {/* Confirm Password */}
          <div className="mb-4">
            <TextField
            icon={ <FaLock className="text-gray-400" />}
              type="password"
              name="confirmPassword"
              id="confirmPassword"
              placeholder="Confirm New Password"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
            />
          </div>

          {/* OTP Input - only show when not first login */}
          {!isFirstLogin && (
            <div className="mb-4">
              <TextField
                type="otp"
                name="otp"
                id="otp"
                value={formData.otp}
                onChange={handleOtpChange}
                otpLength={6}
                label="Google Authenticator Code"
              />
              <div className="text-center mt-2">
                <p className="text-xs text-gray-500">
                  Enter your 6-digit code. Leave empty to request approval.
                </p>
              </div>
            </div>
          )}

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
          <div className="text-center flex justify-center">
            <div className="flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => navigate('/')}
                className="text-sm text-blue-600 hover:text-blue-800 hover:underline 
                           transition flex items-center justify-center gap-2"
              >
                <FaArrowLeft /> Back to Login
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export { ForgotPassword };
