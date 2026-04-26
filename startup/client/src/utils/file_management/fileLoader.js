/**
 * File Loading Utilities
 * Handles loading files from various sources (URLs, API endpoints, etc.)
 */

import { ApiService } from '../../services/ApiService';

/**
 * Determines if a URL is a full URL (http/https)
 * @param {string} url - URL to check
 * @returns {boolean} True if full URL
 */
const isFullUrl = (url) => {
  return url?.startsWith('http://') || url?.startsWith('https://');
};

/**
 * Gets backend origin from environment or current origin
 * @returns {string} Backend origin URL
 */
const getBackendOrigin = () => {
  try {
    const apiUrl = import.meta.env.VITE_API_URL || '';
    if (apiUrl) {
      const urlObj = new URL(apiUrl);
      return urlObj.origin;
    }
    return window.location.origin;
  } catch {
    return window.location.origin;
  }
};

/**
 * Checks if URL is from same origin
 * @param {string} url - URL to check
 * @returns {boolean} True if same origin
 */
const isSameOrigin = (url) => {
  try {
    const urlObj = new URL(url);
    return urlObj.origin === window.location.origin;
  } catch {
    return false;
  }
};

/**
 * Loads file from URL and returns blob URL
 * @param {string} fileUrl - File URL or path
 * @param {string} mimeType - MIME type of the file
 * @returns {Promise<{blobUrl: string, mimeType: string}>} Object with blob URL and MIME type
 */
const loadFile = async (fileUrl, mimeType = '') => {
  if (!fileUrl) {
    throw new Error('File URL is required');
  }

  try {
    // Already a blob URL (e.g. from File before upload) – use as-is
    if (fileUrl.startsWith('blob:')) {
      return {
        blobUrl: fileUrl,
        mimeType: mimeType || '',
      };
    }

    let response;

    if (isFullUrl(fileUrl)) {
      // Handle full URLs
      const sameOrigin = isSameOrigin(fileUrl);
      
      if (sameOrigin) {
        // Same origin - use pathname with ApiService
        const urlObj = new URL(fileUrl);
        response = await ApiService.request('GET', urlObj.pathname, null, {
          responseType: 'blob',
          headers: {},
        });
      } else {
        // Different origin - return URL directly
        return {
          blobUrl: fileUrl,
          mimeType: mimeType || '',
        };
      }
    } else {
      // Handle relative paths
      if (fileUrl.startsWith('/uploads/')) {
        // Static file - construct full URL
        const backendOrigin = getBackendOrigin();
        const fullUrl = `${backendOrigin}${fileUrl}`;
        response = await ApiService.request('GET', fullUrl, null, {
          responseType: 'blob',
          headers: {},
        });
      } else {
        // API endpoint - use ApiService
        response = await ApiService.request('GET', fileUrl, null, {
          responseType: 'blob',
          headers: {},
        });
      }
    }

    const blob = response.data instanceof Blob ? response.data : new Blob([response.data]);
    const blobUrl = URL.createObjectURL(blob);
    const effectiveMime = blob.type || mimeType || '';

    return {
      blobUrl,
      mimeType: effectiveMime,
    };
  } catch (error) {
    console.error('Error loading file:', error);
    let message = 'Something went wrong. File may have been deleted or is unavailable.';
    if (error instanceof Blob) {
      try {
        const text = await error.text();
        const obj = JSON.parse(text);
        message = obj.error || obj.message || message;
      } catch {
        message = 'Something went wrong. File may have been deleted or is unavailable.';
      }
    } else if (error && typeof error === 'object') {
      message = error.error || error.message || message;
    } else if (error?.message) {
      message = error.message;
    }
    throw new Error(message);
  }
};

/**
 * Downloads a file from blob URL
 * @param {string} blobUrl - Blob URL to download
 * @param {string} filename - Filename for download
 */
const downloadFile = (blobUrl, filename = 'download') => {
  if (!blobUrl) return;

  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export { loadFile, downloadFile };

