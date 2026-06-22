import PropTypes from 'prop-types';
import { CheckCircle2 } from 'lucide-react';

/** Post-onboarding confirmation screen shown once the workspace is created. */
function SuccessScreen({ result, onGoToLogin }) {
  return (
    <div className="min-h-screen flex items-center justify-center auth-background p-4">
      <div className="w-full max-w-md bg-white shadow-2xl rounded-3xl overflow-hidden text-center">
        <div className="bg-gradient-to-br from-emerald-500 to-green-600 px-8 py-10">
          <CheckCircle2 className="text-white mx-auto" size={56} />
          <h2 className="text-2xl font-bold text-white mt-3">You&apos;re all set!</h2>
        </div>
        <div className="px-8 py-8">
          <p className="text-gray-600">
            <span className="font-semibold text-gray-800">{result.company?.name}</span> is ready on
            the <span className="font-semibold text-gray-800">{result.subscription?.name}</span> plan.
          </p>
          <p className="text-sm text-gray-500 mt-1">
            Sign in with <span className="font-semibold">{result.user?.username}</span> to get
            started.
          </p>
          <button
            type="button"
            onClick={onGoToLogin}
            className="mt-6 w-full bg-blue-600 text-white py-3 rounded-xl hover:bg-blue-700 transition shadow-md"
          >
            Go to login
          </button>
        </div>
      </div>
    </div>
  );
}

SuccessScreen.propTypes = {
  result: PropTypes.shape({
    company: PropTypes.shape({ name: PropTypes.string }),
    subscription: PropTypes.shape({ name: PropTypes.string }),
    user: PropTypes.shape({ username: PropTypes.string })
  }).isRequired,
  onGoToLogin: PropTypes.func.isRequired
};

export { SuccessScreen };
