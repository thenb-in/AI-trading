import { useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import PropTypes from 'prop-types';
import { useSpotlightTarget } from './useSpotlightTarget';
import { blockerBoxes, placeCard, ringBox } from './spotlightGeometry';
import { TourCard } from './TourCard';

// Dims the page, rings the element the step is about, and explains it in a card pointing at it.
const TourSpotlight = ({
  steps, stepIndex, direction, pageReady, onStep, onFound, onExpand, onFinish, onClose,
}) => {
  const step = steps[stepIndex];
  const isLast = stepIndex === steps.length - 1;
  const { targetRef, rect } = useSpotlightTarget({
    step,
    stepIndex,
    direction,
    stepCount: steps.length,
    pageReady,
    onFound,
    onReplaceStep: onExpand,
    onGoToStep: onStep,
    onFinish,
  });

  const goNext = useCallback(() => {
    if (isLast) {
      onFinish();
      return;
    }
    // An acting step clicks its element — opening a form, or a tab — before moving on.
    if (step?.click) targetRef.current?.click();
    onStep(stepIndex + 1, 1);
  }, [isLast, onFinish, onStep, step, stepIndex, targetRef]);

  const goBack = useCallback(() => {
    if (stepIndex > 0) onStep(stepIndex - 1, -1);
  }, [onStep, stepIndex]);

  // A form with no fields shrinks the steps under the walk, leaving it past the end. That is the end.
  useEffect(() => {
    if (!step) onFinish();
  }, [step, onFinish]);

  if (!step) return null;

  const placement = rect ? placeCard(rect) : null;
  const card = (
    <TourCard
      key={stepIndex}
      step={step}
      stepIndex={stepIndex}
      total={steps.length}
      ready={Boolean(rect)}
      isLast={isLast}
      caretSide={placement?.side}
      caretStyle={placement?.caret}
      onBack={goBack}
      onNext={goNext}
      onClose={onClose}
    />
  );

  // Until the element turns up the card waits mid-screen, so the tour never looks stalled.
  if (!placement) {
    return createPortal(
      <div
        role="dialog"
        aria-label={`Guide: ${step.title}`}
        className="fixed inset-0 z-[1400] flex items-center justify-center bg-slate-900/30 p-4"
      >
        <div className="w-full max-w-sm">{card}</div>
      </div>,
      document.body,
    );
  }

  const ring = ringBox(rect);

  return createPortal(
    <div role="dialog" aria-label={`Guide: ${step.title}`} className="pointer-events-none fixed inset-0 z-[1400]">
      {blockerBoxes(ring).map((blocker) => (
        <div key={blocker.id} aria-hidden="true" className="pointer-events-auto fixed" style={blocker.style} />
      ))}
      {/* The huge spread shadow is what dims everything outside the ring. */}
      <div
        className="fixed rounded-lg shadow-[0_0_0_9999px_rgba(15,23,42,0.55)] ring-2 ring-blue-500 ring-offset-2 ring-offset-transparent transition-all duration-300 ease-out"
        style={ring}
      />
      <div className="fixed transition-all duration-300 ease-out" style={placement.box}>{card}</div>
    </div>,
    document.body,
  );
};

TourSpotlight.propTypes = {
  steps: PropTypes.arrayOf(PropTypes.shape({
    target: PropTypes.string,
    selector: PropTypes.string,
    fields: PropTypes.string,
    tab: PropTypes.number,
    oneOf: PropTypes.array,
    title: PropTypes.string,
    body: PropTypes.string,
    click: PropTypes.bool,
    nextLabel: PropTypes.string,
    wait: PropTypes.number,
  })).isRequired,
  stepIndex: PropTypes.number.isRequired,
  direction: PropTypes.number.isRequired,
  pageReady: PropTypes.bool.isRequired,
  onStep: PropTypes.func.isRequired,
  onFound: PropTypes.func.isRequired,
  onExpand: PropTypes.func.isRequired,
  onFinish: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
};

export { TourSpotlight };
