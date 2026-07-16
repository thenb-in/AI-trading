import { useEffect } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';

const SSO_ACTION = {
  RESET_PASSWORD: 'reset_password',
  SIGNUP: 'signup'
};

const SSO_NOTICE_COOKIE = 'sso_notice';
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
    const notice = readCookie(SSO_NOTICE_COOKIE);
    if (notice) {
      toast.success(notice);
      clearCookie(SSO_NOTICE_COOKIE);
    }
    const cookieError = readCookie(SSO_ERROR_COOKIE);
    if (cookieError) {
      onError?.(cookieError);
      toast.error(cookieError);
      clearCookie(SSO_ERROR_COOKIE);
    }
  }, [onError]);



  const startSso = ({ loginHint, action, companyId } = {}) => {
    const from = location.state?.from;
    const returnTo = (typeof from === 'string' ? from : from?.pathname) || '/admin';
    const qs = new URLSearchParams({ returnTo: String(returnTo) });
    if (loginHint) {
      qs.set('loginHint', String(loginHint));
    }
    if (action) {
      qs.set('action', String(action));
    }
    if (companyId) {
      qs.set('companyId', String(companyId));
    }
    window.location.href = `/api/v1/auth/sso/start?${qs.toString()}`;
  };

  return { startSso };
};

export { useSso, SSO_ACTION };
