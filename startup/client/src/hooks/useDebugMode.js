import { useState, useEffect } from 'react';
import { isDebugMode, setDebugMode, subscribeToDebugMode, toggleDebugMode } from '@services/debugModeService';
import { useDataContext } from '@context/useDataContext';
import { matchesShortcut } from '../utils/keyboardShortcut';


const useDebugModeShortcut = () => useDataContext()?.userData?.company?.debug_mode_shortcut || null;


const useDebugMode = () => {
  const { userData, loading } = useDataContext() || {};
  const shortcut = userData?.company?.debug_mode_shortcut || null;
  const companyKnown = !loading && Boolean(userData);
  const [isDebugModeState, setIsDebugModeState] = useState(isDebugMode);

  useEffect(() => subscribeToDebugMode(setIsDebugModeState), []);

  useEffect(() => {
    if (!companyKnown) {
      return undefined;
    }

    if (!shortcut) {
      setDebugMode(false);
      return undefined;
    }

    const handleKeyDown = (e) => {
      if (!matchesShortcut(e, shortcut)) {
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      toggleDebugMode();
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [companyKnown, shortcut]);

  return isDebugModeState;
};

const useDebugModeValue = () => {
  const [value, setValue] = useState(() => isDebugMode());
  useEffect(() => subscribeToDebugMode(setValue), []);
  return value;
};

export { useDebugMode, useDebugModeValue, useDebugModeShortcut };
