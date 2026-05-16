import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

/**
 * Acts on onboarding deep-links handed to master list pages via `location.state`:
 *  `openCreate` — open the add modal
 *  `openImport` — open the import file picker
 *  `openDownloadTemplate` — download the import template
 * The state is cleared synchronously so a route remount doesn't replay the action.
 *
 * @param {{ headerRef: React.RefObject<{ clickAddButton?: () => void, clickImportInput?: () => void, clickDownloadTemplate?: () => void }> }} args
 */
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
}

export { useMasterPageOnboarding };
