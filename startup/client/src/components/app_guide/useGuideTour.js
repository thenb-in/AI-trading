import { useContext } from 'react';
import { GuideTourContext } from './guideTourContext';

// startTour(task) walks that task's page, endTour() stops it, `done` holds the tasks finished.
const useGuideTour = () => useContext(GuideTourContext);

export { useGuideTour };
