import { STORAGE_KEYS } from '../constants/startup/index';

/**
 * Centralized debug mode service
 * Provides utility functions to check and toggle debug mode state
 */
class DebugModeService {
  constructor() {
    this.listeners = new Set();
    this.setupStorageListener();
  }

  /**
   * Get current debug mode state
   * @returns {boolean} true if debug mode is enabled
   */
  isDebugMode() {
    try {
      return sessionStorage.getItem(STORAGE_KEYS.REPORT_FILTERS_DEBUG) === "true";
    } catch (error) {
      console.error('[DEBUG MODE SERVICE] Error reading debug mode:', error);
      return false;
    }
  }

  /**
   * Toggle debug mode state
   * @returns {boolean} new debug mode state
   */
  toggleDebugMode() {
    try {
      const currentValue = this.isDebugMode();
      const newValue = !currentValue;
      
      console.log('[DEBUG MODE SERVICE] Toggling debug mode:', currentValue, '→', newValue);
      
      sessionStorage.setItem(STORAGE_KEYS.REPORT_FILTERS_DEBUG, newValue.toString());
      
      // Notify all listeners
      this.notifyListeners(newValue);
      
      // Trigger storage event for other tabs
      window.dispatchEvent(new StorageEvent('storage', {
        key: STORAGE_KEYS.REPORT_FILTERS_DEBUG,
        newValue: newValue.toString(),
        oldValue: currentValue.toString()
      }));
      
      return newValue;
    } catch (error) {
      console.error('[DEBUG MODE SERVICE] Error toggling debug mode:', error);
      return false;
    }
  }

  /**
   * Set debug mode to specific value
   * @param {boolean} value - debug mode state to set
   * @returns {boolean} the value that was set
   */
  setDebugMode(value) {
    try {
      const newValue = Boolean(value);
      
      console.log('[DEBUG MODE SERVICE] Setting debug mode to:', newValue);
      
      sessionStorage.setItem(STORAGE_KEYS.REPORT_FILTERS_DEBUG, newValue.toString());
      
      // Notify all listeners
      this.notifyListeners(newValue);
      
      // Trigger storage event for other tabs
      window.dispatchEvent(new StorageEvent('storage', {
        key: STORAGE_KEYS.REPORT_FILTERS_DEBUG,
        newValue: newValue.toString(),
        oldValue: this.isDebugMode().toString()
      }));
      
      return newValue;
    } catch (error) {
      console.error('[DEBUG MODE SERVICE] Error setting debug mode:', error);
      return false;
    }
  }

  /**
   * Subscribe to debug mode changes
   * @param {Function} callback - function to call when debug mode changes
   * @returns {Function} unsubscribe function
   */
  subscribe(callback) {
    this.listeners.add(callback);
    
    // Return unsubscribe function
    return () => {
      this.listeners.delete(callback);
    };
  }

  /**
   * Notify all listeners of debug mode change
   * @param {boolean} newValue - new debug mode state
   */
  notifyListeners(newValue) {
    this.listeners.forEach(callback => {
      try {
        callback(newValue);
      } catch (error) {
        console.error('[DEBUG MODE SERVICE] Error in listener callback:', error);
      }
    });
  }

  /**
   * Setup storage event listener for cross-tab sync
   */
  setupStorageListener() {
    const handleStorageChange = (e) => {
      if (e.key === STORAGE_KEYS.REPORT_FILTERS_DEBUG) {
        const newValue = e.newValue === "true";
        console.log('[DEBUG MODE SERVICE] Storage change detected:', newValue);
        this.notifyListeners(newValue);
      }
    };

    window.addEventListener("storage", handleStorageChange);
    
    // Cleanup on page unload
    window.addEventListener('beforeunload', () => {
      window.removeEventListener("storage", handleStorageChange);
    });
  }
}

// Create singleton instance
const debugModeService = new DebugModeService();

// Export utility functions
export const isDebugMode = () => debugModeService.isDebugMode();
export const toggleDebugMode = () => debugModeService.toggleDebugMode();
export const setDebugMode = (value) => debugModeService.setDebugMode(value);
export const subscribeToDebugMode = (callback) => debugModeService.subscribe(callback);

export default debugModeService;
