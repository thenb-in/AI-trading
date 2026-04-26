import { useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { openHelpSupportNav } from '../utils/startup/openHelpSupportNav';

function useHelpSupportShortcut() {
  const navigate = useNavigate();
  const location = useLocation();

  const openHelp = useCallback(() => {
    openHelpSupportNav({ navigate, location });
  }, [navigate, location]);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.repeat) return;

      const isAltH =
        e.altKey &&
        !e.ctrlKey &&
        !e.metaKey &&
        (e.key === 'h' || e.key === 'H' || e.code === 'KeyH');
      const isF1 = e.key === 'F1';

      if (!isAltH && !isF1) return;

      e.preventDefault();
      openHelp();
    };

    document.addEventListener('keydown', onKeyDown, true);
    return () => document.removeEventListener('keydown', onKeyDown, true);
  }, [openHelp]);
}

export { useHelpSupportShortcut };
