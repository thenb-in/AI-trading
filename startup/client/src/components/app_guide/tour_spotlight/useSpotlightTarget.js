import { useCallback, useEffect, useRef, useState } from 'react';
import { findStepTarget } from './findOnPage';
import { buildFieldSteps, buildFormSteps, isTabOpen } from './formStepDiscovery';

const POLL_MS = 100;
const FIRST_TARGET_WAIT_MS = 5000;
const LATER_TARGET_WAIT_MS = 700;
const SETTLED_POLLS = 2;

const readForm = (step) => (step.tab === undefined ? buildFormSteps(step.fields) : buildFieldSteps(step.fields));

const firstOptionOnPage = (step) => step.oneOf.find((option) => findStepTarget(option)) || null;

const sameBox = (a, b) => Boolean(a) && Boolean(b)
  && a.top === b.top && a.left === b.left && a.width === b.width && a.height === b.height;

// Finds the element the current step is about, then keeps its box current as the page moves.
const useSpotlightTarget = ({
  step, stepIndex, direction, stepCount, pageReady, onFound, onReplaceStep, onGoToStep, onFinish,
}) => {
  const targetRef = useRef(null);
  const frameRef = useRef(0);
  const [rect, setRect] = useState(null);

  const measure = useCallback(() => {
    const target = targetRef.current;
    if (!target) {
      setRect(null);
      return;
    }
    const box = target.getBoundingClientRect();
    setRect((current) => (sameBox(current, box) ? current : box));
  }, []);

  const setTarget = useCallback((target) => {
    targetRef.current = target;
    measure();
    if (target) onFound();
  }, [measure, onFound]);

  useEffect(() => {
    if (!step) return undefined;
    setTarget(null);

    const waitMs = step.wait ?? (pageReady ? LATER_TARGET_WAIT_MS : FIRST_TARGET_WAIT_MS);
    const startedAt = Date.now();
    const isOverdue = () => Date.now() - startedAt >= waitMs;
    let settledPolls = 0;

    const passOver = () => {
      const skipTo = stepIndex + direction;
      if (skipTo < 0) onGoToStep(stepIndex + 1, 1);
      else if (skipTo >= stepCount) onFinish();
      else onGoToStep(skipTo, direction);
    };

    const poll = setInterval(() => {
      if (step.oneOf) {
        const option = firstOptionOnPage(step);
        if (option) {
          clearInterval(poll);
          onReplaceStep(stepIndex, [option]);
        } else if (isOverdue()) {
          clearInterval(poll);
          passOver();
        }
        return;
      }

      const target = findStepTarget(step);

      if (target && step.fields) {
        settledPolls = step.tab === undefined || isTabOpen(step.tab) ? settledPolls + 1 : 0;
        if (settledPolls >= SETTLED_POLLS) {
          clearInterval(poll);
          onReplaceStep(stepIndex, readForm(step));
          return;
        }
      } else if (target) {
        clearInterval(poll);
        target.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'smooth' });
        setTarget(target);
        return;
      }

      if (isOverdue()) {
        clearInterval(poll);
        passOver();
      }
    }, POLL_MS);

    return () => clearInterval(poll);
  }, [step, stepIndex, direction, stepCount, pageReady, setTarget, onReplaceStep, onGoToStep, onFinish]);

  useEffect(() => {
    const scheduleMeasure = () => {
      if (frameRef.current) return;
      frameRef.current = requestAnimationFrame(() => {
        frameRef.current = 0;
        measure();
      });
    };
    window.addEventListener('scroll', scheduleMeasure, true);
    window.addEventListener('resize', scheduleMeasure);

    return () => {
      window.removeEventListener('scroll', scheduleMeasure, true);
      window.removeEventListener('resize', scheduleMeasure);
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [measure]);

  return { targetRef, rect };
};

export { useSpotlightTarget };
