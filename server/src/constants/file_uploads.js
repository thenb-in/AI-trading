// File upload constants
// Allowed file extensions for upload (array format maintained for iteration needs)
const ALLOWED_FILE_EXTENSIONS = ['.csv', '.xlsx', '.xls'];

// File upload size and type constants
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

// Arrays maintained for iteration needs
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif'];
const ALLOWED_DOCUMENT_TYPES = ['application/pdf', 'text/plain'];

module.exports = {
  ALLOWED_FILE_EXTENSIONS,
  MAX_FILE_SIZE,
  ALLOWED_IMAGE_TYPES,
  ALLOWED_DOCUMENT_TYPES
};

