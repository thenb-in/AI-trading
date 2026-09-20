import { useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useSso } from '@startup/hooks/useSso';

/**
 * The Wallet SSO screen, at its own path so /google, /linkedin, /apple can
 * sit alongside it later. LoginRedirectionPage sends visitors here to start
 * the round trip, or back here with ?sso=1 when the round trip came back
 * without a session (Wallet-side cancel/failure) — that case shows retry
 * instead of auto-starting again.
 */
function WalletLoginPage() {
  const { startSso } = useSso();
  const [searchParams] = useSearchParams();
  const hasStarted = useRef(false);

  const signInDidNotComplete = searchParams.get('sso') === '1';

  useEffect(() => {
    if (signInDidNotComplete || hasStarted.current) {
      return;
    }
    hasStarted.current = true;
    startSso();
  }, [signInDidNotComplete, startSso]);

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

export { WalletLoginPage };
