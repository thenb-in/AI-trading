/**
 * File Type Detection Utilities
 * Detects file types based on MIME type and URL extension
 */

/**
 * Extensions each built-in viewer can render, keyed by the type `getFileType`
 * returns. This is the single place the list lives: the detection below and the
 * "what can I preview?" message in UnsupportedViewer both read it, so teaching a
 * viewer a new format cannot leave the UI advertising the old set.
 *
 * Order matters. `ogg` is both a video and an audio container and video is
 * matched first, so an .ogg with no MIME type keeps opening in the video player.
 */
const PREVIEWABLE_EXTENSIONS = {
  pdf: ['pdf'],
  image: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'],
  video: ['mp4', 'webm', 'ogg', 'avi', 'mov', 'wmv', 'flv'],
  audio: ['mp3', 'wav', 'ogg', 'aac', 'flac', 'm4a']
};

/** Labels used when telling a user which formats preview, in detection order. */
const PREVIEWABLE_FORMAT_GROUPS = [
  { label: 'Documents', extensions: PREVIEWABLE_EXTENSIONS.pdf },
  { label: 'Images', extensions: PREVIEWABLE_EXTENSIONS.image },
  { label: 'Video', extensions: PREVIEWABLE_EXTENSIONS.video },
  { label: 'Audio', extensions: PREVIEWABLE_EXTENSIONS.audio }
];

const extensionMatcher = (type) => new RegExp(`\\.(${PREVIEWABLE_EXTENSIONS[type].join('|')})$`, 'i');

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
  if (mime.includes('pdf') || extensionMatcher('pdf').test(urlLower)) {
    return 'pdf';
  }

  // Images
  if (mime.startsWith('image/') || extensionMatcher('image').test(urlLower)) {
    return 'image';
  }

  // Video
  if (mime.startsWith('video/') || extensionMatcher('video').test(urlLower)) {
    return 'video';
  }

  // Audio
  if (mime.startsWith('audio/') || extensionMatcher('audio').test(urlLower)) {
    return 'audio';
  }

  // Excel
  if (mime.includes('spreadsheet') || mime.includes('excel') || /\.(xlsx|xls)$/i.test(urlLower)) {
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
  return Object.keys(PREVIEWABLE_EXTENSIONS).includes(fileType);
};

/**
 * Checks if file type requires download
 * @param {string} fileType - File type from getFileType
 * @returns {boolean} True if file requires download
 */
const requiresDownload = (fileType) => {
  return !isPreviewable(fileType);
};

export {
  getFileType,
  isPreviewable,
  requiresDownload,
  PREVIEWABLE_EXTENSIONS,
  PREVIEWABLE_FORMAT_GROUPS
};
