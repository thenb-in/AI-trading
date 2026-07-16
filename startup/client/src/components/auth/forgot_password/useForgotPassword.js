import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { ApiService } from '@services/ApiService';
import { cleanFormData } from '@utils/authformvalidation';

const useForgotPassword = ({ isFirstLogin = false, prefillUsername = '' } = {}) => {
  const [method, setMethod] = useState(null);
  const [ssoConfigured, setSsoConfigured] = useState(false);
  const [username, setUsername] = useState(prefillUsername);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const identifyUsername = useCallback(async (rawUsername) => {
    const cleanedUsername = cleanFormData({ username: rawUsername }).username;
    if (!cleanedUsername) {
      setError('Username is required');
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const response = await ApiService.identifyForgotPasswordMethod(cleanedUsername);
      setUsername(cleanedUsername);
      setMethod(response.data.method);
      setSsoConfigured(Boolean(response.data.ssoConfigured));
    } catch (err) {
      const message = err.error || 'Unable to look up this username';
      setError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const resetLocalPassword = useCallback(async ({ newPassword, confirmPassword, otp }) => {
    const cleaned = cleanFormData({ username, newPassword, confirmPassword });

    if (cleaned.newPassword !== cleaned.confirmPassword) {
      setError('Passwords do not match');
      return false;
    }

    setIsLoading(true);
    setError(null);
    try {
      await ApiService.request('POST', '/auth/reset-password', {
        username: cleaned.username,
        password: cleaned.newPassword,
        isFirstLogin,
        otp: !isFirstLogin ? otp : undefined
      });
      toast.success('Password reset successful! Please log in.');
      return true;
    } catch (err) {
      const message = err.error || 'Unable to reset password';
      setError(message);
      toast.error(message);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [username, isFirstLogin]);


  const restart = useCallback(() => {
    setMethod(null);
    setSsoConfigured(false);
    setError(null);
  }, []);

  const hasAutoIdentified = useRef(false);
  useEffect(() => {
    if (!isFirstLogin || !prefillUsername || hasAutoIdentified.current) {
      return;
    }
    hasAutoIdentified.current = true;
    identifyUsername(prefillUsername);
  }, [isFirstLogin, prefillUsername, identifyUsername]);

  return {
    method,
    username,
    ssoConfigured,
    isLoading,
    error,
    setError,
    identifyUsername,
    resetLocalPassword,
    restart
  };
};

export { useForgotPassword };
