import PropTypes from 'prop-types';
import { motion } from 'framer-motion';
import { Loader2, X } from 'lucide-react';
import { ProgressBar } from '@startup/components/base_components/ProgressBar';

// Which edge of the card the caret sits on, given the side of the element the card opened towards.
const CARET_CLASS = {
  bottom: '-top-1.5 border-l border-t',
  top: '-bottom-1.5 border-b border-r',
  right: '-left-1.5 border-b border-l',
};

// The card explaining one step of a tour, pointing back at the element the step is about.
const TourCard = ({
  step, stepIndex, total, ready, isLast, caretSide, caretStyle, onBack, onNext, onClose,
}) => (
  <motion.div
    initial={{ opacity: 0, y: 6 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.18, ease: 'easeOut' }}
    className="pointer-events-auto relative rounded-xl bg-white shadow-2xl ring-1 ring-slate-200"
  >
    {caretSide && (
      <span
        aria-hidden="true"
        className={`absolute h-3 w-3 rotate-45 border-slate-200 bg-white ${CARET_CLASS[caretSide]}`}
        style={caretStyle}
      />
    )}
    <ProgressBar
      percent={((stepIndex + 1) / total) * 100}
      barClass="fill-blue-600"
      trackClass="fill-slate-100"
      className="block h-1 w-full overflow-hidden rounded-t-xl"
    />
    <div className="p-4">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
          Step {stepIndex + 1} of {total}
        </p>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close the guide"
          className="-mr-1 -mt-1 rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <h3 className="mt-1 text-base font-semibold text-slate-900">{step.title}</h3>
      {ready ? (
        <p className="mt-1 text-sm leading-relaxed text-slate-600">{step.body}</p>
      ) : (
        <p className="mt-2 flex items-center gap-2 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Getting it ready…
        </p>
      )}
      <div className="mt-4 flex items-center justify-between gap-3">
        <button type="button" onClick={onClose} className="text-xs font-medium text-slate-500 hover:text-slate-700">
          Skip tour
        </button>
        <div className="flex gap-2">
          {stepIndex > 0 && (
            <button
              type="button"
              onClick={onBack}
              className="rounded-md border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Back
            </button>
          )}
          <button
            type="button"
            onClick={onNext}
            disabled={!ready}
            className="rounded-md bg-blue-600 px-3.5 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:cursor-wait disabled:opacity-60"
          >
            {isLast ? 'Finish' : step.nextLabel || 'Next'}
          </button>
        </div>
      </div>
    </div>
  </motion.div>
);

TourCard.propTypes = {
  step: PropTypes.shape({
    title: PropTypes.string,
    body: PropTypes.string,
    nextLabel: PropTypes.string,
  }).isRequired,
  stepIndex: PropTypes.number.isRequired,
  total: PropTypes.number.isRequired,
  ready: PropTypes.bool.isRequired,
  isLast: PropTypes.bool.isRequired,
  caretSide: PropTypes.oneOf(['top', 'bottom', 'right']),
  caretStyle: PropTypes.object,
  onBack: PropTypes.func.isRequired,
  onNext: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
};

export { TourCard };
