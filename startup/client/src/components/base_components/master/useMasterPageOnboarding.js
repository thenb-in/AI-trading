import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

/**
 * Acts on onboarding deep-links handed to master list pages, from two sources:
 *  - router `location.state`: `openCreate` / `openImport` / `openDownloadTemplate`
 *    (in-app navigation — e.g. a "Create" button elsewhere in the SPA).
 *  - a `?onboard=create|import|template` query param (external links — e.g. an
 *    "Open this screen" link in the product manual at /docs, which is a static
 *    site and can only pass a URL, not router state).
 * Each opens the add modal / import picker / template download, then the state or
 * param is cleared so a route remount doesn't replay the action.
 *
 * @param {{ headerRef: React.RefObject<{ clickAddButton?: () => void, clickImportInput?: () => void, clickDownloadTemplate?: () => void }> }} args
 */
const ONBOARD_ACTIONS = {
  create: (headerRef) => headerRef.current?.clickAddButton?.(),
  import: (headerRef) => headerRef.current?.clickImportInput?.(),
  template: (headerRef) => headerRef.current?.clickDownloadTemplate?.(),
};

function useMasterPageOnboarding({ headerRef }) {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const state = location.state || {};
    if (state.openCreate) {
      navigate(location.pathname, { replace: true, state: {} });
      headerRef.current?.clickAddButton?.();
    } else if (state.openImport && headerRef.current?.clickImportInput) {
      navigate(location.pathname, { replace: true, state: {} });
      headerRef.current.clickImportInput();
    } else if (state.openDownloadTemplate) {
      navigate(location.pathname, { replace: true, state: {} });
      headerRef.current?.clickDownloadTemplate?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only when onboarding state is set
  }, [location.state?.openCreate, location.state?.openImport, location.state?.openDownloadTemplate]);

  // External deep-link via URL (/admin/master/<key>?onboard=create|import|template).
  // The manual is a static site, so it cannot set router state — it passes the
  // action as a query param, which we run and then strip from the URL.
  useEffect(() => {
    const action = new URLSearchParams(location.search).get('onboard');
    const run = ONBOARD_ACTIONS[action];
    if (!run) return;
    navigate(location.pathname, { replace: true });
    run(headerRef);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only when the onboard param is set
  }, [location.search]);
}

export { useMasterPageOnboarding };
