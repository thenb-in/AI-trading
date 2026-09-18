import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { useLocation, useNavigate } from 'react-router-dom';
import { useDataContext } from '@context/useDataContext';
import { TourSpotlight } from './tour_spotlight/TourSpotlight';
import { GuideTourContext } from './guideTourContext';
import { useGuideProgress } from './useGuideProgress';


const GuideTourProvider = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { userData } = useDataContext();
  const { done, markDone } = useGuideProgress(userData?.id ?? userData?.user_id);
  const [tour, setTour] = useState(null);


  const runningTaskIdRef = useRef(null);

  const startTour = useCallback((task) => {
    if (!task?.tour?.length) return;
    runningTaskIdRef.current = task.id;
    navigate(task.path);
    setTour({ task, steps: task.tour, stepIndex: 0, direction: 1, pageReady: false });
  }, [navigate]);

  const endTour = useCallback(() => {
    runningTaskIdRef.current = null;
    setTour(null);
  }, []);

  const finishTour = useCallback(() => {
    if (runningTaskIdRef.current) markDone(runningTaskIdRef.current);
    endTour();
  }, [markDone, endTour]);

  const goToStep = useCallback((stepIndex, direction) => {
    setTour((current) => (current ? { ...current, stepIndex, direction } : current));
  }, []);

  const markPageReady = useCallback(() => {
    setTour((current) => (current && !current.pageReady ? { ...current, pageReady: true } : current));
  }, []);

  // A step standing for a whole form becomes one step per field once the form is on screen.
  const replaceStep = useCallback((stepIndex, replacement) => {
    setTour((current) => (current
      ? {
        ...current,
        steps: [...current.steps.slice(0, stepIndex), ...replacement, ...current.steps.slice(stepIndex + 1)],
      }
      : current));
  }, []);

  useEffect(() => {
    setTour((current) => (current && current.task.path !== location.pathname ? null : current));
  }, [location.pathname]);


  useEffect(() => {
    if (!tour) runningTaskIdRef.current = null;
  }, [tour]);

  const value = useMemo(() => ({ startTour, endTour, done }), [startTour, endTour, done]);

  return (
    <GuideTourContext.Provider value={value}>
      {children}
      {tour && (
        <TourSpotlight
          steps={tour.steps}
          stepIndex={tour.stepIndex}
          direction={tour.direction}
          pageReady={tour.pageReady}
          onStep={goToStep}
          onFound={markPageReady}
          onExpand={replaceStep}
          onFinish={finishTour}
          onClose={endTour}
        />
      )}
    </GuideTourContext.Provider>
  );
};

GuideTourProvider.propTypes = {
  children: PropTypes.node,
};

export { GuideTourProvider };
