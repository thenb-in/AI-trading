import { useEffect } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';

const SSO_ERROR_COOKIE = 'sso_error';

const readCookie = (name) => {
  const match = document.cookie
    .split('; ')
    .find((row) => row.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : null;
};

const clearCookie = (name) => {
  document.cookie = `${name}=; Max-Age=0; path=/`;
};

const useSso = (onError) => {
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    const ssoError = searchParams.get('sso_error');
    if (!ssoError) {
      return;
    }
    onError?.(ssoError);
    toast.error(ssoError);
    const next = new URLSearchParams(searchParams);
    next.delete('sso_error');
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams, onError]);

  useEffect(() => {
    const cookieError = readCookie(SSO_ERROR_COOKIE);
    if (cookieError) {
      onError?.(cookieError);
      toast.error(cookieError);
      clearCookie(SSO_ERROR_COOKIE);
    }
  }, [onError]);




  const startSso = () => {
    const from = location.state?.from;
    const returnTo = (typeof from === 'string' ? from : from?.pathname) || '/admin';
    const qs = new URLSearchParams({ returnTo: String(returnTo) });
    window.location.href = `/api/v1/auth/sso/start?${qs.toString()}`;
  };

  return { startSso };
};

export { useSso };
