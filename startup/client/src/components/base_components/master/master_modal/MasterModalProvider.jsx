import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import {
  getMasterCreators,
  getMasterModalEvents,
} from '@/data/masterCreatorRegistry';

/**
 * Inline master modals, opened from anywhere: to create a record, or to edit
 * one by `recordId` (the modal loads it).
 *
 * The framework owns the plumbing — open/close state, the context hook, the
 * window-event bridge — and the app owns which masters exist and which
 * component draws each one. That split is the whole point: a dropdown in a
 * framework component can offer "create a customer" without the framework
 * ever importing an app page.
 *
 * Registration is a side-effect import and must run *before* this provider
 * mounts, because the window-event bridge binds what is registered at mount.
 *
 * Records the framework itself owns register through
 * registerFrameworkMasterCreators, so a framework selector opens its dialog
 * through the same one mechanism an app master does.
 */
const MasterModalContext = createContext(null);

// What the picker's create row had typed, for the creator's modal to fill its first field with.
const CreatorInitialNameContext = createContext('');

function MasterModalProvider({ children }) {
  // Open modals, bottom first: a creator opened from inside another (an item
  // group from the item form) sits on top of it, and the one below keeps what was typed.
  const [stack, setStack] = useState([]);

  const openMasterModal = useCallback(
    ({ masterName, data = null, recordId = null, onSuccess = null, defaults = {} }) => {
      const creators = getMasterCreators();
      if (!creators[masterName]) {
        // Nothing would open and the click would look broken, so name both
        // what was asked for and what is actually registered.
        console.warn(
          `[MasterModalProvider] No modal registered for master "${masterName}". Registered: ${Object.keys(creators).join(', ') || 'none'}`
        );
        return;
      }
      setStack((open) => [...open, { masterName, data, recordId, onSuccess, defaults }]);
    },
    []
  );

  // Global open requests, so code that doesn't hold the context can still ask
  // for a modal. Which events exist, and what they map to, is the app's call.
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const events = getMasterModalEvents();
    const bound = Object.entries(events).map(([eventName, toRequest]) => {
      const handler = (e) => {
        const request = typeof toRequest === 'function' ? toRequest(e?.detail) : null;
        if (request?.masterName) openMasterModal(request);
      };
      window.addEventListener(eventName, handler);
      return [eventName, handler];
    });
    return () => bound.forEach(([n, h]) => window.removeEventListener(n, h));
  }, [openMasterModal]);

  // Closing a modal closes whatever was opened on top of it too.
  const closeAt = useCallback((index) => setStack((open) => open.slice(0, index)), []);

  // A modal that saved closes first, then hands the record to whoever opened it.
  const succeedAt = useCallback((index, entry, created) => {
    closeAt(index);
    entry.onSuccess?.(created);
  }, [closeAt]);

  // The top modal, for code outside the modals.
  const closeMasterModal = useCallback(() => setStack((open) => open.slice(0, -1)), []);

  const value = useMemo(
    () => ({ openMasterModal, closeMasterModal, hasCreator: (masterName) => Boolean(getMasterCreators()[masterName]) }),
    [openMasterModal, closeMasterModal]
  );

  const creators = getMasterCreators();

  return (
    <MasterModalContext.Provider value={value}>
      {children}
      {stack.map((entry, index) => {
        const Component = creators[entry.masterName];
        return (
          // Modals only open and close at the top, so the position is a stable key.
          <CreatorInitialNameContext.Provider key={index} value={entry.defaults.initialName || ''}>
            <Component
              isOpen
              modalData={entry.data}
              recordId={entry.recordId}
              defaults={entry.defaults}
              onClose={() => closeAt(index)}
              onSuccess={(created) => succeedAt(index, entry, created)}
            />
          </CreatorInitialNameContext.Provider>
        );
      })}
    </MasterModalContext.Provider>
  );
}

MasterModalProvider.propTypes = {
  children: PropTypes.node.isRequired
};

// No provider: opening warns rather than throwing, and `hasCreator` lets a
// component hide the affordance instead of offering one that does nothing.
// A framework component cannot assume an app mounted the provider, and taking
// a whole screen down over a missing create button would be the worse failure.
const NO_PROVIDER = {
  hasCreator: () => false,
  closeMasterModal: () => {},
  openMasterModal: ({ masterName } = {}) => {
    console.warn(
      `[useMasterCreator] Cannot open "${masterName}": no <MasterModalProvider> is mounted above this component.`
    );
  }
};

function useMasterCreator() {
  return useContext(MasterModalContext) || NO_PROVIDER;
}

const useCreatorInitialName = () => useContext(CreatorInitialNameContext);

export { MasterModalProvider, useMasterCreator, useCreatorInitialName };
