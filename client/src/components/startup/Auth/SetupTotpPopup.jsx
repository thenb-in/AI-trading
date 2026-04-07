import { useState, useEffect, useCallback } from 'react';
import { FaQrcode, FaCheck } from 'react-icons/fa';
import { toast } from 'react-toastify';
import PropTypes from 'prop-types';
import { ApiService } from '@services/startup/ApiService';
import { MasterModal } from '../base_components/master/MasterModal/MasterModal';
import { OtpTypeField } from '@/components/startup/base_components/fieldss/OtpTypeField';

const SetupTotpPopup = ({ isOpen, onClose, onSuccess, username }) => {
  const [totpData, setTotpData] = useState(null);
  const [totpCode, setTotpCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [step, setStep] = useState('generate'); // 'generate', 'scan', 'verify'

  const generateTotpSecret = useCallback(async () => {
    setError(null);

    try {
      const response = await ApiService.generateTotpSecret({
        username: username
      });

      setTotpData(response.data);
      setStep('scan');
      toast.success('TOTP secret generated successfully!');
    } catch (err) {
      const errorData = err || {};
      const message = errorData.error || err.error || 'Failed to generate TOTP secret.';
      setError(message);
      toast.error(message);
    }
  }, [username]);

  useEffect(() => {
    if (isOpen && username) {
      generateTotpSecret();
    }
  }, [isOpen, username, generateTotpSecret]);

  const verifyTotpCode = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      await ApiService.verifyAndEnableTotp({
        username: username,
        totpCode: totpCode
      });

      toast.success('TOTP setup completed successfully!');
      onSuccess(); // Call success callback to close popup and continue login flow
    } catch (err) {
      const errorData = err || {};
      const message = errorData.error || err.error || 'Failed to verify TOTP code.';
      setError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setTotpData(null);
    setTotpCode('');
    setError(null);
    setStep('generate');
    onClose();
  };

  return (
    <MasterModal
      isOpen={isOpen}
      onClose={handleClose}
      title="Setup Google Authenticator"
      maxWidth="sm"
    >
      <div className="p-4">
        {step === 'generate' && (
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Generating TOTP secret...</p>
          </div>
        )}

        {step === 'scan' && totpData && (
          <div className="space-y-4">
            <div className="text-center">
              <FaQrcode className="mx-auto text-4xl text-blue-600 mb-2" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Scan QR Code</h3>
              <p className="text-sm text-gray-600 mb-4">
                Open Google Authenticator and scan this QR code to add your account.
              </p>
            </div>
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <h4 className="font-semibold text-blue-900 mb-2 text-sm">How to scan:</h4>
              <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                <li>Open Google Authenticator app</li>
                <li>Tap the &quot;+&quot; button to add an account</li>
                <li>Select &quot;Scan a QR code&quot; or &quot;Enter a setup key&quot;</li>
                <li>Scan the QR code above or enter the key manually</li>

              </ol>
            </div>
            <div className="flex justify-center">
              <img
                src={totpData.qrCodeUrl}
                alt="TOTP QR Code"
                className="border border-gray-300 rounded-lg"
              />
            </div>

            <div className="text-center">
              <p className="text-xs text-gray-500 mb-2">Or manually enter this code:</p>
              <code className="bg-gray-100 px-2 py-1 rounded text-sm font-mono break-all">
                {totpData.secret}
              </code>
            </div>

            <button
              onClick={() => setStep('verify')}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
            >
              I&apos;ve scanned the code
            </button>
          </div>
        )}

        {step === 'verify' && (
          <form onSubmit={verifyTotpCode} className="space-y-4">
            <div className="text-center">
              <FaCheck className="mx-auto text-4xl text-green-600 mb-2" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Verify Setup</h3>
              <p className="text-sm text-gray-600 mb-4">
                Enter the 6-digit code from Google Authenticator to complete setup.
              </p>
            </div>

            <div>
              <OtpTypeField
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                otpLength={6}
                className="text-center text-lg tracking-widest"
              />
            </div>

            {error && (
              <div className="text-red-600 text-sm text-center">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || totpCode.length !== 6}
              className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? 'Verifying...' : 'Complete Setup'}
            </button>
          </form>
        )}
      </div>
    </MasterModal>
  );
};

SetupTotpPopup.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSuccess: PropTypes.func.isRequired,
  username: PropTypes.string.isRequired
};

export { SetupTotpPopup };
