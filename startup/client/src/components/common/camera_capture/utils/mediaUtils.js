/**
 * Media-related utility functions
 */

import { VIDEO_MIME_TYPES } from '../constants/cameraConstants';

/**
 * Get supported video MIME type for MediaRecorder
 * @returns {string} Supported MIME type or empty string
 */
const getSupportedMimeType = () => {
  for (const type of VIDEO_MIME_TYPES) {
    if (MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }
  return '';
};

/**
 * Get file extension from MIME type
 * @param {string} mimeType - MIME type string
 * @returns {string} File extension
 */
const getExtensionFromMimeType = (mimeType) => {
  return mimeType?.includes('mp4') ? 'mp4' : 'webm';
};

export { getSupportedMimeType, getExtensionFromMimeType };

