/**
 * Camera-related utility functions
 */

import { CAMERA_LABEL_KEYWORDS } from '../constants/cameraConstants';

/**
 * Check if device label indicates front camera
 * @param {string} label - Device label
 * @returns {boolean}
 */
const isFrontCameraLabel = (label) => {
  const lowerLabel = label.toLowerCase();
  return CAMERA_LABEL_KEYWORDS.FRONT.some(keyword => lowerLabel.includes(keyword));
};

/**
 * Check if device label indicates back camera
 * @param {string} label - Device label
 * @returns {boolean}
 */
const isBackCameraLabel = (label) => {
  const lowerLabel = label.toLowerCase();
  return CAMERA_LABEL_KEYWORDS.BACK.some(keyword => lowerLabel.includes(keyword));
};

/**
 * Get camera status message based on capabilities
 * @param {Object} capabilities - Camera capabilities object
 * @returns {string|null} Status message or null
 */
const getCameraStatusMessage = (capabilities) => {
  const { hasFrontCamera, totalCameras, detectionComplete } = capabilities;

  if (!detectionComplete) return null;

  if (totalCameras === 0) {
    return 'No cameras detected on this device.';
  }

  if (totalCameras === 1) {
    if (hasFrontCamera) {
      return 'Using front camera (back camera not available).';
    }
    return 'Using available camera.';
  }

  return null;
};

export { isFrontCameraLabel, isBackCameraLabel, getCameraStatusMessage };

