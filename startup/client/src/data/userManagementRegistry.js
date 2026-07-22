
const emptyColumns = () => [];
const noopApproveExtension = () => ({ renderExtras: null, runAfterApprove: async () => {} });

let extraColumnsFactory = emptyColumns;
let approveExtensionHook = noopApproveExtension;

/**
 * Register the app's extra-column factory.
 * @param {(onUserProfileUpdate?: Function) => Array<object>} factory
 */
const registerUserManagementExtraColumns = (factory) => {
  extraColumnsFactory = typeof factory === 'function' ? factory : emptyColumns;
};

/**
 * Build the app-registered extra columns, or [] if the app registered none.
 */
const getUserManagementExtraColumns = (onUserProfileUpdate) =>
  extraColumnsFactory(onUserProfileUpdate);

/**
 * Register the app's approve-extension hook.
 * @param {(args: { confirmDialog: object }) => { renderExtras: any, runAfterApprove: Function }} hook
 */
const registerApproveExtension = (hook) => {
  approveExtensionHook = typeof hook === 'function' ? hook : noopApproveExtension;
};


const useApproveExtension = (args) => approveExtensionHook(args);

export {
  registerUserManagementExtraColumns,
  getUserManagementExtraColumns,
  registerApproveExtension,
  useApproveExtension,
};
