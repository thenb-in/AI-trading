import { useNavigate, useLocation } from 'react-router-dom';
import { FaArrowLeft } from 'react-icons/fa';
import { useSso, SSO_ACTION } from '@startup/hooks/useSso';
import { useForgotPassword } from './useForgotPassword';
import { UsernameStep } from './UsernameStep';
import { WalletSsoStep } from './WalletSsoStep';
import { LocalResetStep } from './LocalResetStep';
import {
  FORGOT_PASSWORD_METHOD_WALLET_SSO,
  FORGOT_PASSWORD_METHOD_LOCAL_TOTP
} from './constants';

const ForgotPassword = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isFirstLogin = location.state?.isFirstLogin || false;
  const prefillUsername = location.state?.username || '';

  const {
    method,
    username,
    ssoConfigured,
    isLoading,
    error,
    setError,
    identifyUsername,
    resetLocalPassword,
    restart
  } = useForgotPassword({ isFirstLogin, prefillUsername });

  const { startSso } = useSso(setError);

  const isUsernameStep = !method;
  const isWalletSso = method === FORGOT_PASSWORD_METHOD_WALLET_SSO;
  const canPickAnotherUsername = !isUsernameStep && !isFirstLogin;

  const handleBackToLogin = () => {
    navigate('/');
  };

  const handleStartSso = () => {
    startSso({
      loginHint: username,
      action: SSO_ACTION.RESET_PASSWORD
    });
  };

  const handleLocalReset = async (formData) => {
    const didReset = await resetLocalPassword(formData);
    if (didReset) {
      setTimeout(() => navigate('/'), 1000);
    }
  };

  const resolveHeading = () => {
    if (isUsernameStep) {
      return { title: 'Forgot Password', subtitle: 'Enter your username' };
    }
    if (isWalletSso) {
      return { title: 'Managed by Wallet', subtitle: 'Reset happens on NBNext Wallet' };
    }
    return isFirstLogin
      ? { title: 'Reset Password', subtitle: 'Set a new password to continue' }
      : { title: 'Reset Password', subtitle: 'Choose a new password' };
  };

  const heading = resolveHeading();

  return (
    <div className="min-h-screen flex items-center justify-center auth-background">
      <div className="w-full max-w-md">
        <div className="bg-white shadow-2xl rounded-2xl px-8 pt-6 pb-8 mb-4 transform transition-all duration-300 hover:scale-[1.01]">
          <div className="text-center mb-6">
            <h2 className="text-3xl font-bold text-gray-800 mb-2">{heading.title}</h2>
            <p className="text-gray-600">{heading.subtitle}</p>
            {isFirstLogin && !isWalletSso && (
              <p className="text-sm text-amber-600 mt-2 bg-amber-50 py-2 rounded-lg">
                Password reset required to continue
              </p>
            )}
          </div>

          {error && (
            <div className="mb-4 text-center">
              <p className="text-red-500 text-sm bg-red-50 py-2 rounded-lg">{error}</p>
            </div>
          )}

          {isUsernameStep && (
            <UsernameStep isLoading={isLoading} onSubmit={identifyUsername} />
          )}

          {!isUsernameStep && isWalletSso && (
            <WalletSsoStep
              username={username}
              ssoConfigured={ssoConfigured}
              onStartSso={handleStartSso}
            />
          )}

          {!isUsernameStep && !isWalletSso && (
            <LocalResetStep
              isFirstLogin={isFirstLogin}
              requiresTotp={method === FORGOT_PASSWORD_METHOD_LOCAL_TOTP}
              isLoading={isLoading}
              onSubmit={handleLocalReset}
            />
          )}

          <div className="mt-6 pt-5 border-t border-gray-100">
            <div className="flex items-center justify-center gap-3 text-sm">
              {canPickAnotherUsername && (
                <>
                  <button
                    type="button"
                    onClick={restart}
                    className="inline-flex items-center gap-1.5 font-medium text-gray-500
                               hover:text-gray-800 transition-colors duration-200
                               focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500
                               focus-visible:ring-offset-2 rounded"
                  >
                    <FaArrowLeft className="text-xs" />
                    Use another username
                  </button>
                  <span aria-hidden="true" className="h-4 w-px bg-gray-200" />
                </>
              )}
              <button
                type="button"
                onClick={handleBackToLogin}
                className="font-medium text-blue-600 hover:text-blue-700 transition-colors
                           duration-200 focus:outline-none focus-visible:ring-2
                           focus-visible:ring-blue-500 focus-visible:ring-offset-2 rounded"
              >
                Back to Login
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export { ForgotPassword };
