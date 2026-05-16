/**
 * Utility functions for managing modal z-index values
 * Ensures modals appear above fullscreen grids and other UI elements
 */

// Z-index constants
const Z_INDEX = {
  // Fullscreen grid uses 9999
  FULLSCREEN_GRID: 9999,
  // Grid header in fullscreen uses 10000-10003
  FULLSCREEN_GRID_HEADER: 10003,
  // Modals should be above fullscreen elements
  MODAL: 10010,
  // Material-UI Dialog default is 1300, but we need higher for fullscreen
  MATERIAL_UI_DIALOG: 10010,
  // Toast notifications
  TOAST: 10000,
};

/**
 * Detects if any data grid is currently in fullscreen mode
 * @returns {boolean} True if a fullscreen grid is detected
 */
const isFullscreenModeActive = () => {
  // Check for elements with fullscreen grid z-index
  const fullscreenGrids = document.querySelectorAll('[style*="z-index: 9999"]');
  if (fullscreenGrids.length > 0) {
    return true;
  }
  
  // Alternative: Check for fixed positioned elements that cover the viewport
  // This is a more reliable check for fullscreen mode
  const fixedElements = document.querySelectorAll('[style*="position: fixed"]');
  for (const element of fixedElements) {
    const style = window.getComputedStyle(element);
    const zIndex = parseInt(style.zIndex, 10);
    if (zIndex >= Z_INDEX.FULLSCREEN_GRID && 
        style.top === '0px' && 
        (style.left === '0px' || style.right === '0px')) {
      return true;
    }
  }
  
  return false;
};

/**
 * Gets the appropriate z-index for modals
 * Returns a higher value when fullscreen mode is active
 * @returns {number} Z-index value for modals
 */
const getModalZIndex = () => {
  return Z_INDEX.MODAL;
};

/**
 * Gets the appropriate z-index for Material-UI Dialogs
 * @returns {number} Z-index value for Material-UI Dialogs
 */
const getMaterialUIDialogZIndex = () => {
  return Z_INDEX.MATERIAL_UI_DIALOG;
};

/**
 * Gets z-index as a Tailwind CSS class
 * @returns {string} Tailwind z-index class
 */
const getModalZIndexClass = () => {
  return 'z-[10010]';
};

export {
  Z_INDEX,
  isFullscreenModeActive,
  getModalZIndex,
  getMaterialUIDialogZIndex,
  getModalZIndexClass,
};

