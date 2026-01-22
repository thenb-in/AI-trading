/**
 * File Type Detection Utilities
 * Detects file types based on MIME type and URL extension
 */

/**
 * Detects file type from MIME type and URL
 * @param {string} mimeType - MIME type of the file
 * @param {string} url - URL or file path
 * @returns {string} File type: 'pdf' | 'image' | 'video' | 'audio' | 'excel' | 'csv' | 'unknown'
 */
const getFileType = (mimeType, url) => {
  const mime = mimeType?.toLowerCase() || '';
  const urlLower = url?.toLowerCase() || '';
  
  // PDF
  if (mime.includes('pdf') || urlLower.endsWith('.pdf')) {
    return 'pdf';
  }
  
  // Images
  if (mime.startsWith('image/') || /\.(jpg|jpeg|png|gif|bmp|webp|svg)$/i.test(url)) {
    return 'image';
  }
  
  // Video
  if (mime.startsWith('video/') || /\.(mp4|webm|ogg|avi|mov|wmv|flv)$/i.test(url)) {
    return 'video';
  }
  
  // Audio
  if (mime.startsWith('audio/') || /\.(mp3|wav|ogg|aac|flac|m4a)$/i.test(url)) {
    return 'audio';
  }
  
  // Excel
  if (mime.includes('spreadsheet') || mime.includes('excel') || /\.(xlsx|xls)$/i.test(url)) {
    return 'excel';
  }
  
  // CSV
  if (mime.includes('csv') || mime.includes('text/csv') || urlLower.endsWith('.csv')) {
    return 'csv';
  }
  
  return 'unknown';
};

/**
 * Checks if file type is previewable in browser
 * @param {string} fileType - File type from getFileType
 * @returns {boolean} True if file can be previewed
 */
const isPreviewable = (fileType) => {
  return ['pdf', 'image', 'video', 'audio'].includes(fileType);
};

/**
 * Checks if file type requires download
 * @param {string} fileType - File type from getFileType
 * @returns {boolean} True if file requires download
 */
const requiresDownload = (fileType) => {
  return ['excel', 'csv', 'unknown'].includes(fileType);
};

export { getFileType, isPreviewable, requiresDownload };

