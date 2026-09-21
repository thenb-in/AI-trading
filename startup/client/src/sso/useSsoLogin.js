import { useCallback } from 'react';
import { ssoApi } from './ssoApi';
import { getApiErrorMessage } from '@utils/apiErrorMessage';

function useSsoLogin(uid) {
  return useCallback(async ({ username, password }) => {
    try {
      const response = await ssoApi.login(uid, { username, password });
      window.location.assign(response.data.redirectTo);
    } catch (err) {
      if (err.redirectTo) {
        window.location.assign(err.redirectTo);
        return;
      }
      const failure = new Error(getApiErrorMessage(err, 'Sign-in failed.'));
      failure.requiresPasswordChange = Boolean(err.requiresPasswordChange);
      throw failure;
    }
  }, [uid]);
}

export { useSsoLogin };
