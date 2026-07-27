import { useState } from 'react';
import PropTypes from 'prop-types';
import { useNavigate, useLocation } from 'react-router-dom';
import { FaArrowLeft } from 'react-icons/fa';
import { useForgotPassword } from './useForgotPassword';
import { UsernameStep } from './UsernameStep';
import { LocalResetStep } from './LocalResetStep';
import { SetupTotpPopup } from '../SetupTotpPopup';


const ForgotPassword = ({ onSubmit, onBackToLogin } = {}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const isFirstLogin = location.state?.isFirstLogin || false;
  const prefillUsername = location.state?.username || '';

  const {
    account,
    isLoading,
    error,
    identifyUsername,
    resetLocalPassword,
    restart
  } = useForgotPassword({ isFirstLogin, prefillUsername, onSubmit });

  const [totpJustEnabled, setTotpJustEnabled] = useState(false);
  const [isTotpSetupOpen, setIsTotpSetupOpen] = useState(false);

  const isUsernameStep = !account;
  const canPickAnotherUsername = !isUsernameStep && !isFirstLogin;
  const hasTotp = Boolean(account?.isTotpEnabled) || totpJustEnabled;
  const canSetupTotp = !isUsernameStep && !isFirstLogin && !hasTotp;

  const handleLocalReset = async (formData) => {
    const didReset = await resetLocalPassword(formData);
    if (didReset) {
      const afterReset = onBackToLogin || (() => navigate('/'));
      setTimeout(afterReset, 1000);
    }
  };

  const handleBackToLogin = onBackToLogin || (() => navigate('/login'));
  const handleOpenTotpSetup = () => setIsTotpSetupOpen(true);
  const handleCloseTotpSetup = () => setIsTotpSetupOpen(false);
  const handleTotpSetupSuccess = () => {
    setIsTotpSetupOpen(false);
    setTotpJustEnabled(true);
  };

  const resolveHeading = () => {
    if (isUsernameStep) {
      return { title: 'Forgot Password', subtitle: 'Enter your username' };
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
            {isFirstLogin && (
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

          {!isUsernameStep && (
            <>
              {canSetupTotp && (
                <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
                  <p className="text-sm text-blue-800 mb-2">
                    Enable two-factor authentication with Google Authenticator to verify your identity and reset your password instantly.
                  </p>
                  <button
                    type="button"
                    onClick={handleOpenTotpSetup}
                    className="text-sm font-semibold text-blue-600 hover:text-blue-800 hover:underline transition"
                  >
                    Set up two-factor authentication
                  </button>
                </div>
              )}
              <LocalResetStep
                isFirstLogin={isFirstLogin}
                requiresTotp={hasTotp}
                isLoading={isLoading}
                onSubmit={handleLocalReset}
              />
            </>
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

      {isTotpSetupOpen && account && (
        <SetupTotpPopup
          isOpen={isTotpSetupOpen}
          onClose={handleCloseTotpSetup}
          onSuccess={handleTotpSetupSuccess}
          username={account.username}
        />
      )}
    </div>
  );
};

ForgotPassword.propTypes = {
  onSubmit: PropTypes.func,
  onBackToLogin: PropTypes.func,
};

export { ForgotPassword };
