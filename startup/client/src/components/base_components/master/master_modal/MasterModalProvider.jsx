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

const EMPTY_STATE = { masterName: null, data: null, recordId: null, onSuccess: null, defaults: {} };

function MasterModalProvider({ children }) {
  const [state, setState] = useState(EMPTY_STATE);

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
      setState({ masterName, data, recordId, onSuccess, defaults });
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

  const closeMasterModal = useCallback(() => {
    setState(EMPTY_STATE);
  }, []);

  const handleSuccess = useCallback(
    (created) => {
      const cb = state.onSuccess;
      setState(EMPTY_STATE);
      if (cb) cb(created);
    },
    [state.onSuccess]
  );

  const value = useMemo(
    () => ({ openMasterModal, closeMasterModal, hasCreator: (masterName) => Boolean(getMasterCreators()[masterName]) }),
    [openMasterModal, closeMasterModal]
  );

  const Component = state.masterName ? getMasterCreators()[state.masterName] : null;

  return (
    <MasterModalContext.Provider value={value}>
      {children}
      {Component && (
        <Component
          isOpen={Boolean(state.masterName)}
          modalData={state.data}
          recordId={state.recordId}
          defaults={state.defaults}
          onClose={closeMasterModal}
          onSuccess={handleSuccess}
        />
      )}
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

export { MasterModalProvider, useMasterCreator };
