import PropTypes from 'prop-types';
import { RefreshCw, AlertTriangle, ShieldCheck } from 'lucide-react';


function PaymentFailedScreen({ message, orderId, onRetry, onGoToLogin }) {
  return (
    <div className="min-h-screen flex items-center justify-center auth-background p-4">
      <div className="w-full max-w-md bg-white shadow-2xl rounded-3xl overflow-hidden text-center">
        <div className="bg-gradient-to-br from-amber-500 to-orange-600 px-8 py-10">
          <AlertTriangle className="text-white mx-auto" size={52} />
          <h2 className="text-2xl font-bold text-white mt-3">We couldn&apos;t finish your signup</h2>
        </div>

        <div className="px-8 py-8">
          <p className="text-gray-600">
            {message || 'Your payment was received but setup could not be completed.'}
          </p>

          <div className="mt-5 flex items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-left text-sm text-emerald-800">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
            <span>
              You won&apos;t be charged for an incomplete signup — any amount captured is refunded
              automatically, and usually reflects in 5–7 business days.
            </span>
          </div>

          {orderId && (
            <div className="mt-5 rounded-xl bg-gray-50 px-4 py-3 text-left">
              <p className="text-xs font-medium uppercase tracking-wider text-gray-400">
                Order ID — quote this if you contact support
              </p>
              <p className="mt-1 select-all font-mono text-sm font-semibold text-gray-700 break-all">
                {orderId}
              </p>
            </div>
          )}

          <button
            type="button"
            onClick={onRetry}
            className="mt-6 w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-3 rounded-xl hover:bg-blue-700 transition shadow-md"
          >
            <RefreshCw size={16} /> Try again
          </button>
          <button
            type="button"
            onClick={onGoToLogin}
            className="mt-3 w-full text-sm font-medium text-gray-500 hover:text-gray-700 transition"
          >
            Back to login
          </button>
        </div>
      </div>
    </div>
  );
}

PaymentFailedScreen.propTypes = {
  message: PropTypes.string,
  orderId: PropTypes.string,
  onRetry: PropTypes.func.isRequired,
  onGoToLogin: PropTypes.func.isRequired
};

export { PaymentFailedScreen };
