import { useEffect } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useDataContext } from '@context/useDataContext';
import { isSsoEnabled } from '@startup/sso/ssoMode';

/**
 * Entry gateway mounted at "/". Decides where the visitor belongs and gets
 * out of the way — it renders nothing itself. Already signed in → the page
 * they were headed to (or /admin). A failed Wallet round trip (sso=1, no
 * session) → /wallet, which owns the retry UI. Otherwise → /wallet or
 * /login depending on which auth mode this deployment runs.
 */
function LoginRedirectionPage() {
  const { userData, loading } = useDataContext();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();

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
    if (isSsoReturn) {
      navigate(`/wallet${window.location.search}`, { replace: true });
      return;
    }
    // Carry ProtectedRoute's `state.from` through so /wallet's startSso() still
    // knows where to send the user back to after signing in.
    navigate(isSsoEnabled() ? '/wallet' : '/login', { replace: true, state: location.state });
  }, [loading, userData, isSsoReturn, searchParams, navigate, location.state]);

  return null;
}

export { LoginRedirectionPage };
