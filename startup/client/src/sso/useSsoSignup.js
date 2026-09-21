import { useCallback } from 'react';
import { ssoApi } from './ssoApi';
import { getApiErrorMessage } from '@utils/apiErrorMessage';

function useSsoSignup(uid) {
  return useCallback(async ({ name, username, phone, password, companyId }) => {
    try {
      const response = await ssoApi.signup(uid, { name, username, phone, password, companyId });
      return { pendingApproval: Boolean(response.data?.pendingApproval) };
    } catch (err) {
      throw new Error(getApiErrorMessage(err, 'Signup failed. Please try again.'));
    }
  }, [uid]);
}

export { useSsoSignup };
