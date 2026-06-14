// Framework -> app hook. The framework's User Management calls this after a
// user is approved so an app can run extra side-effects (e.g. create a linked
// employee record) and inject extra UI into the approve confirmation dialog.
//
// This is the reference-scaffold no-op: it does nothing and renders nothing.
// Apps override this file with their own implementation.

function useApproveExtension(/* { confirmDialog } */) {
  return {
    // Invoked with the just-approved user. No-op in the scaffold.
    runAfterApprove: async () => {},
    // Extra content rendered inside the approve confirmation dialog.
    renderExtras: null,
  };
}

export { useApproveExtension };
