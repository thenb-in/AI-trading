// Registry for the "create a master inline" modals that <MasterModalProvider>
// renders. The framework owns the provider, the open/close plumbing and the
// context hook; the app owns which masters exist and which component draws
// each one, so those are registered from app/ rather than imported here.
//
// Shape: { [type: string]: React component }. Each component is rendered with
// { isOpen, modalData, recordId, defaults, onClose, onSuccess }; `recordId`
// asks for that record to be edited, loaded by the modal itself.

// Creators the framework ships for its own records (roles, ...). Separate from
// the app's so that an app registering its masters cannot wipe them, and so an
// app can deliberately override one by registering the same key.
const frameworkCreators = {};

let masterCreatorProvider = () => ({});

// Global window events that should pop a master modal, so any part of the app
// can request one without holding the context. Registered as
// { [eventName]: (detail) => ({ type, data, defaults }) | null }.
let masterModalEventProvider = () => ({});

/** Framework-owned creators. Called from startup/, not from an app. */
const registerFrameworkMasterCreators = (creators) => {
  Object.assign(frameworkCreators, creators || {});
};

const registerMasterCreators = (provider) => {
  if (typeof provider === 'function') {
    masterCreatorProvider = provider;
  } else if (provider && typeof provider === 'object') {
    masterCreatorProvider = () => provider;
  } else {
    masterCreatorProvider = () => ({});
  }
};

const getMasterCreators = () => ({ ...frameworkCreators, ...(masterCreatorProvider() || {}) });

const registerMasterModalEvents = (provider) => {
  if (typeof provider === 'function') {
    masterModalEventProvider = provider;
  } else if (provider && typeof provider === 'object') {
    masterModalEventProvider = () => provider;
  } else {
    masterModalEventProvider = () => ({});
  }
};

const getMasterModalEvents = () => masterModalEventProvider() || {};

export {
  registerFrameworkMasterCreators,
  registerMasterCreators,
  getMasterCreators,
  registerMasterModalEvents,
  getMasterModalEvents,
};
