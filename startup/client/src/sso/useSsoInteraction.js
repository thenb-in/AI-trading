import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  SSO_INTERACTION_PARAM,
  ROUTE_HOME,
  ROUTE_LOGIN,
  ROUTE_SIGNUP,
  ROUTE_FORGOT_PASSWORD
} from './constants';
import { ssoApi } from './ssoApi';


const withInteraction = (path, uid) =>
  `${path}?${SSO_INTERACTION_PARAM}=${encodeURIComponent(uid)}`;

function useSsoInteraction() {
  const [searchParams] = useSearchParams();
  const uid = searchParams.get(SSO_INTERACTION_PARAM);

  const [details, setDetails] = useState(null);
  const [isLoading, setIsLoading] = useState(Boolean(uid));
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!uid) {
      setDetails(null);
      setIsLoading(false);
      setError(null);
      return undefined;
    }

    let active = true;
    setIsLoading(true);
    ssoApi.getInteraction(uid)
      .then((response) => {
        if (active) {
          setDetails(response.data);
          setError(null);
        }
      })
      .catch(() => {
        if (active) {
          setDetails(null);
          setError('This sign-in request has expired. Please start again from the app.');
        }
      })
      .finally(() => {
        if (active) {
          setIsLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [uid]);

  return {
    uid,
    isSso: Boolean(uid),
    appName: details?.appName || null,
    prefillUsername: details?.username || '',
    companyId: details?.companyId || null,
    companyName: details?.companyName || null,
    companyExists: details?.companyExists ?? null,
    isLoading,
    error,
    loginPath: uid ? withInteraction(ROUTE_LOGIN, uid) : ROUTE_HOME,
    signupPath: uid ? withInteraction(ROUTE_SIGNUP, uid) : ROUTE_SIGNUP,
    forgotPasswordPath: uid ? withInteraction(ROUTE_FORGOT_PASSWORD, uid) : ROUTE_FORGOT_PASSWORD
  };
}

export { useSsoInteraction };
