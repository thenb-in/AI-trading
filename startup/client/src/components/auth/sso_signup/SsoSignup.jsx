import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { FaArrowLeft, FaBuilding, FaShieldAlt, FaSignInAlt } from 'react-icons/fa';
import { useSso, SSO_ACTION } from '@startup/hooks/useSso';
import { TextTypeField } from '@startup/components/base_components/fields/TextTypeField';


const SsoSignup = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [error, setError] = useState(null);
  const { startSso } = useSso(setError);

  const [companyId, setCompanyId] = useState(() => searchParams.get('company_id') || '');

  const handleBackToLogin = () => {
    navigate('/');
  };

  const handleCompanyChange = (e) => {
    setCompanyId(e.target.value.replace(/[<>&]/g, ''));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    startSso({
      action: SSO_ACTION.SIGNUP,
      companyId: companyId.trim()
    });
  };

  const canSubmit = companyId.trim().length > 0;

  return (
    <div className="min-h-screen flex items-center justify-center auth-background">
      <div className="w-full max-w-md">
        <div className="bg-white shadow-2xl rounded-2xl px-8 pt-6 pb-8 mb-4 transform transition-all duration-300 hover:scale-[1.01]">
          <div className="text-center mb-6">
            <h2 className="text-3xl font-bold text-gray-800 mb-2">Sign up with Wallet</h2>
            <p className="text-gray-600">Your account is created on NBNext Wallet</p>
          </div>

          {error && (
            <div className="mb-4 text-center">
              <p className="text-red-500 text-sm bg-red-50 py-2 rounded-lg">{error}</p>
            </div>
          )}

          <div className="mb-6 flex items-start gap-3 bg-blue-50 rounded-lg p-4">
            <FaShieldAlt className="text-blue-600 mt-1 shrink-0" />
            <p className="text-sm text-blue-900 text-left">
              You will set your password on NBNext Wallet. An admin approves your
              access afterwards.
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            {/* Shown either way: a signup link prefills it, and anyone arriving
                without one can enter it themselves. */}
            <div className="mb-4">
              <TextTypeField
                icon={<FaBuilding className="text-gray-400" />}
                name="companyId"
                id="companyId"
                placeholder="Company ID"
                value={companyId}
                onChange={handleCompanyChange}
                required
              />
              <p className="text-xs text-gray-500 mt-2 text-center">
               ask your administrator for it.
              </p>
            </div>

            <div className="mb-6">
              <button
                type="submit"
                className="w-full bg-blue-600 text-white py-3 rounded-lg
                           hover:bg-blue-700 transition duration-300
                           transform hover:scale-[1.02] shadow-md hover:shadow-lg
                           disabled:opacity-50 disabled:cursor-not-allowed
                           flex items-center justify-center gap-2"
                disabled={!canSubmit}
              >
                Continue to NBNext Wallet <FaSignInAlt className="text-xs" />
              </button>
            </div>
          </form>

          <div className="mt-6 pt-5 border-t border-gray-100">
            <div className="flex items-center justify-center text-sm">
              <button
                type="button"
                onClick={handleBackToLogin}
                className="inline-flex items-center gap-1.5 font-medium text-blue-600
                           hover:text-blue-700 transition-colors duration-200
                           focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500
                           focus-visible:ring-offset-2 rounded"
              >
                <FaArrowLeft className="text-xs" />
                Back to Login
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export { SsoSignup };
