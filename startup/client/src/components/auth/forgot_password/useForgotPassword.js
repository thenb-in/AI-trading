import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { ApiService } from '@services/ApiService';
import { cleanFormData } from '@utils/authformvalidation';
import { getApiErrorMessage } from '@utils/apiErrorMessage';


const useForgotPassword = ({ isFirstLogin = false, prefillUsername = '', onSubmit } = {}) => {
  // account = { username, isTotpEnabled } once the username is confirmed to exist.
  const [account, setAccount] = useState(null);
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
      const response = await ApiService.checkAvailability('username', cleanedUsername);
      if (response.data.available) {
        const message = 'No account found for this username';
        setError(message);
        toast.error(message);
        return;
      }

      if (response.data.isSso) {
        const message = 'This account signs in with SSO. Reset your password with sso.';
        setError(message);
        toast.error(message);
        return;
      }
      setAccount({
        username: response.data.value || cleanedUsername,
        isTotpEnabled: Boolean(response.data.isTotpEnabled)
      });
    } catch (err) {
      const message = getApiErrorMessage(err, 'Unable to look up this username');
      setError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const resetLocalPassword = useCallback(async ({ newPassword, confirmPassword, otp }) => {
    if (!account) {
      return false;
    }
    const cleaned = cleanFormData({ username: account.username, newPassword, confirmPassword });

    if (cleaned.newPassword !== cleaned.confirmPassword) {
      setError('Passwords do not match');
      return false;
    }

    setIsLoading(true);
    setError(null);
    try {
      const resetPayload = {
        username: cleaned.username,
        password: cleaned.newPassword,
        otp: account.isTotpEnabled ? otp : undefined
      };

      if (typeof onSubmit === 'function') {
        await onSubmit(resetPayload);
      } else {
        await ApiService.request('POST', '/auth/reset-password', resetPayload);
      }
      toast.success('Password reset successful! Please log in.');
      return true;
    } catch (err) {
      const message = getApiErrorMessage(err, 'Unable to reset password');
      setError(message);
      toast.error(message);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [account, onSubmit]);


  const restart = useCallback(() => {
    setAccount(null);
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
    account,
    isLoading,
    error,
    setError,
    identifyUsername,
    resetLocalPassword,
    restart
  };
};

export { useForgotPassword };
