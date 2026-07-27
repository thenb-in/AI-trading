import { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useSso } from '@startup/hooks/useSso';
import { useDataContext } from '@context/useDataContext';
import { isSsoEnabled } from '@startup/sso/ssoMode';


function SsoLoginPage() {
  const { startSso } = useSso();
  const { userData, loading } = useDataContext();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const hasStarted = useRef(false);

  const isSsoReturn = searchParams.get('sso') === '1';

  useEffect(() => {
    if (loading) {
      return;
    }
    if (userData) {
      const returnTo = searchParams.get('returnTo');
      navigate(returnTo && returnTo.startsWith('/') ? returnTo : '/admin', { replace: true });
      return;
    }
    // SSO (consumer) mode off → don't kick off an SSO redirect; use the local
    // login page instead.
    if (!isSsoEnabled()) {
      navigate('/login', { replace: true });
      return;
    }
    if (isSsoReturn) {
      return;
    }

    if (hasStarted.current) {
      return;
    }
    hasStarted.current = true;
    startSso();
  }, [loading, userData, isSsoReturn, searchParams, navigate, startSso]);

  const signInDidNotComplete = !loading && !userData && isSsoReturn;

  return (
    <div className="min-h-screen flex items-center justify-center auth-background">
      <div className="text-center">
        {signInDidNotComplete ? (
          <>
            <p className="text-sm text-gray-700 mb-3">We couldn&apos;t complete your sign-in.</p>
            <button
              type="button"
              onClick={() => startSso()}
              className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
            >
              Try again
            </button>
          </>
        ) : (
          <>
            <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600" />
            <p className="text-sm text-gray-600">Taking you to NBNext Wallet…</p>
          </>
        )}
      </div>
    </div>
  );
}

export { SsoLoginPage };
