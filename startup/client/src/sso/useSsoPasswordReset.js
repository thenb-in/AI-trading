import { useCallback } from 'react';
import { ssoApi } from './ssoApi';

// Returns a password-reset submit handler for the OIDC interaction flow.
function useSsoPasswordReset(uid) {
  return useCallback(async ({ username, password, otp }) => {
    try {
      const response = await ssoApi.resetPassword(uid, { username, password, otp });
      return { pendingApproval: Boolean(response.data.pendingApproval) };
    } catch (err) {
      throw new Error(err.error || 'Unable to reset password');
    }
  }, [uid]);
}

export { useSsoPasswordReset };
