import { useState, useEffect } from 'react';
import { isDebugMode, subscribeToDebugMode, toggleDebugMode } from '@services/debugModeService';

/**
 * Custom hook to manage debug mode state
 * Debug mode is controlled by session storage and can be toggled with Alt+D globally
 */
const useDebugMode = () => {
  const [isDebugModeState, setIsDebugModeState] = useState(() => {
    const value = isDebugMode();
    console.log('[DEBUG MODE HOOK] Initial state:', value);
    return value;
  });

  useEffect(() => {
    console.log('[DEBUG MODE HOOK] Setting up global keyboard listener and subscription');
    
    // Global Alt+D keyboard handler for debug mode toggle
    const handleKeyDown = (e) => {
      console.log('[DEBUG MODE] Key pressed:', {
        key: e.key,
        altKey: e.altKey,
        ctrlKey: e.ctrlKey,
        shiftKey: e.shiftKey,
        metaKey: e.metaKey,
        code: e.code,
        which: e.which
      });
      
      // Check for Alt+D/Option+D - handle both regular 'd' and Mac special character 'ð'
      const isAltD = e.altKey && (
        e.key === "d" || 
        e.key === "D" || 
        e.key === "ð" ||  // Mac Alt+D produces this character
        e.code === "KeyD" ||  // Physical key code
        e.which === 68  // Legacy key code for 'D'
      );
      
      if (isAltD) {
        console.log('[DEBUG MODE] Alt+D detected! Toggling debug mode...');
        e.preventDefault();
        e.stopPropagation();
        
        // Use the service to toggle debug mode
        toggleDebugMode();
      }
    };

    // Subscribe to debug mode changes
    const unsubscribe = subscribeToDebugMode((newValue) => {
      console.log('[DEBUG MODE HOOK] State changed:', newValue);
      setIsDebugModeState(newValue);
    });

    console.log('[DEBUG MODE HOOK] Adding keyboard listener...');
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      console.log('[DEBUG MODE HOOK] Cleaning up keyboard listener and subscription');
      document.removeEventListener("keydown", handleKeyDown);
      unsubscribe();
    };
  }, []);

  console.log('[DEBUG MODE HOOK] Current debug mode state:', isDebugModeState);
  return isDebugModeState;
};

export { useDebugMode };
