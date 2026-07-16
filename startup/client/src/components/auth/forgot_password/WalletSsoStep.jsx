import { FaShieldAlt, FaSignInAlt } from 'react-icons/fa';
import PropTypes from 'prop-types';

const WalletSsoStep = ({ username, ssoConfigured, onStartSso }) => {
  return (
    <div>
      <div className="mb-6 flex items-start gap-3 bg-blue-50 rounded-lg p-4">
        <FaShieldAlt className="text-blue-600 mt-1 shrink-0" />
        <p className="text-sm text-blue-900 text-left">
          The password for <span className="font-semibold">{username}</span> is
          managed by NBNext Wallet.
        </p>
      </div>

      {ssoConfigured ? (
        <div className="mb-6">
          <button
            type="button"
            onClick={onStartSso}
            className="w-full bg-blue-600 text-white py-3 rounded-lg
                       hover:bg-blue-700 transition duration-300
                       transform hover:scale-[1.02] shadow-md hover:shadow-lg
                       flex items-center justify-center gap-2"
          >
            Reset on NBNext Wallet <FaSignInAlt className="text-xs" />
          </button>
        </div>
      ) : (
        <div className="mb-6">
          <p className="text-sm text-amber-700 bg-amber-50 py-3 px-4 rounded-lg">
            SSO not configured. Contact your administrator.
          </p>
        </div>
      )}
    </div>
  );
};

WalletSsoStep.propTypes = {
  username: PropTypes.string.isRequired,
  ssoConfigured: PropTypes.bool,
  onStartSso: PropTypes.func.isRequired
};

export { WalletSsoStep };
