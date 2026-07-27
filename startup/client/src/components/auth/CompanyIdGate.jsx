import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FaBuilding, FaArrowLeft, FaArrowRight, FaInfoCircle } from 'react-icons/fa';
import PropTypes from 'prop-types';
import { ApiService } from '@services/ApiService';
import { TextTypeField } from '@startup/components/base_components/fields/TextTypeField';

function CompanyIdGate({
  initialCompanyId = '',
  loginPath = '/login',
  getStartedPath = '/get-started',
  onConfirmed,
}) {
  const [companyId, setCompanyId] = useState(initialCompanyId);
  const [isChecking, setIsChecking] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const check = useCallback(async (id, fromLink = false) => {
    const trimmed = String(id || '').trim();
    if (!trimmed) {
      setError('Please enter your company ID.');
      return;
    }
    setIsChecking(true);
    setError('');
    try {
      const response = await ApiService.companyExists(trimmed);
      if (response.data.exists) {
        onConfirmed(response.data.company);
        return;
      }
      if (fromLink) {
        const message = 'We couldn’t find that organization. Please check your sign-up link or company ID.';
        setError(message);
        toast.error(message);
        return;
      }
      navigate(getStartedPath, { state: { companyId: trimmed } });
    } catch (err) {
      const message = err?.error || 'Could not check that company ID. Please try again.';
      setError(message);
      if (fromLink) {
        toast.error(message);
      }
    } finally {
      setIsChecking(false);
    }
  }, [navigate, onConfirmed, getStartedPath]);

  // An id we were handed (e.g. from a sign-up link or the SSO interaction) needs
  // no typing — verify it automatically.
  useEffect(() => {
    if (initialCompanyId) {
      check(initialCompanyId, true);
    }
  }, [initialCompanyId, check]);

  const handleSubmit = (e) => {
    e.preventDefault();
    check(companyId);
  };

  const handleChange = (e) => {
    setCompanyId(e.target.value.replace(/[<>&]/g, ''));
    setError('');
  };

  return (
    <div className="flex items-center justify-center mt-4 auth-background">
      <div className="w-full max-w-md">
        <form
          onSubmit={handleSubmit}
          className="bg-white shadow-2xl rounded-2xl px-8 pt-8 pb-8 mb-4 transform transition-all duration-300 hover:scale-[1.01]"
        >
          <div className="text-center mb-6">
            <div className="flex justify-center mb-4">
              <span className="flex items-center justify-center w-14 h-14 rounded-full bg-blue-50">
                <FaBuilding className="text-blue-600 text-xl" />
              </span>
            </div>
            <h2 className="text-3xl font-bold text-gray-800 mb-2">Join your company</h2>
            <p className="text-gray-600">
              Accounts live inside a company. Enter its ID to continue.
            </p>
          </div>

          {error && (
            <div className="mb-4 text-center">
              <p className="text-red-500 text-sm bg-red-50 py-2 rounded-lg">{error}</p>
            </div>
          )}

          <button
            type="button"
            onClick={() => navigate(getStartedPath)}
            className="w-full mb-6 flex items-center justify-between gap-3 rounded-xl border border-blue-100 bg-blue-50/60 px-4 py-3 text-left transition hover:bg-blue-50 hover:border-blue-200"
          >
            <span>
              <span className="block text-sm font-semibold text-blue-800">
                New here? Create your organization
              </span>
              <span className="block text-xs text-blue-700/80 mt-0.5">
                Set up your workspace and onboard your team in minutes
              </span>
            </span>
            <FaArrowRight className="text-blue-600 shrink-0" />
          </button>

          <div className="mb-2">
            <TextTypeField
              icon={<FaBuilding className="text-gray-400" />}
              name="companyId"
              id="companyId"
              placeholder="e.g. 3f9b1c2a-7d54-4e18-9a2b-6c0f5d8e1b74"
              value={companyId}
              onChange={handleChange}
              required
            />
          </div>

          <div className="mb-6 mt-2 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5">
            <FaInfoCircle className="mt-0.5 shrink-0 text-amber-600" />
            <p className="text-xs text-amber-800">
              Ask your administrator for the company ID to join your company.
            </p>
          </div>

          <div className="mb-6">
            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition duration-300 transform hover:scale-[1.02] shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              disabled={isChecking}
            >
              {isChecking ? 'Checking...' : 'Continue'}
            </button>
          </div>

          <div className="text-center pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={() => navigate(loginPath)}
              className="text-sm text-blue-600 hover:text-blue-800 hover:underline transition inline-flex items-center justify-center gap-2"
            >
              <FaArrowLeft /> Back to Login
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

CompanyIdGate.propTypes = {
  initialCompanyId: PropTypes.string,
  loginPath: PropTypes.string,
  getStartedPath: PropTypes.string,
  onConfirmed: PropTypes.func.isRequired,
};

export { CompanyIdGate };
