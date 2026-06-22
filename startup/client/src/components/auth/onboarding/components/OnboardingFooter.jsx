import PropTypes from 'prop-types';
import { ArrowLeft, ArrowRight, Lock, Loader2 } from 'lucide-react';

/** Sticky footer navigation — Back on the left, Next / Pay on the right. */
function OnboardingFooter({ isFirstStep, isLastStep, submitting, onBack, onNext, onPay }) {
  return (
    <div className="sticky bottom-0 z-10 border-t border-gray-200/80 bg-white/90 backdrop-blur px-6 md:px-10 py-4">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          disabled={isFirstStep || submitting}
          className="flex items-center gap-2 rounded-lg px-4 py-2.5 font-medium text-gray-600 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ArrowLeft size={16} /> Back
        </button>

        {isLastStep ? (
          <button
            type="button"
            onClick={onPay}
            disabled={submitting}
            className="group flex items-center gap-2.5 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-7 py-2.5 font-semibold text-white shadow-md shadow-blue-600/20 transition-all hover:shadow-lg hover:shadow-blue-600/30 focus:outline-none focus:ring-2 focus:ring-blue-500/50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Processing…
              </>
            ) : (
              <>
                <Lock size={15} className="opacity-90" />
                Proceed to secure payment
              </>
            )}
          </button>
        ) : (
          <button
            type="button"
            onClick={onNext}
            className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-2.5 font-semibold text-white shadow-md shadow-blue-600/20 transition hover:shadow-lg hover:shadow-blue-600/30"
          >
            Next <ArrowRight size={16} />
          </button>
        )}
      </div>
    </div>
  );
}

OnboardingFooter.propTypes = {
  isFirstStep: PropTypes.bool.isRequired,
  isLastStep: PropTypes.bool.isRequired,
  submitting: PropTypes.bool.isRequired,
  onBack: PropTypes.func.isRequired,
  onNext: PropTypes.func.isRequired,
  onPay: PropTypes.func.isRequired
};

export { OnboardingFooter };
