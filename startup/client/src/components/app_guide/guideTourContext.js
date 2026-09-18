import { createContext } from 'react';

// What a running tour offers any component that asks: start one, stop one, and what is done.
const GuideTourContext = createContext({ startTour: () => {}, endTour: () => {}, done: new Set() });

export { GuideTourContext };
