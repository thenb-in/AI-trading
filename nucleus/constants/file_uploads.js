// File upload constants
// Allowed file extensions for upload (array format maintained for iteration needs)
const ALLOWED_FILE_EXTENSIONS = ['.csv', '.xlsx', '.xls'];

// File upload size and type constants
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

// Arrays maintained for iteration needs
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif'];
const ALLOWED_DOCUMENT_TYPES = ['application/pdf', 'text/plain'];
const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];

// Subfolder under UPLOADS_DIR where unregistered face images are quarantined
const UNREGISTER_FACE_FOLDER = 'unregisterface';
// Subfolders for capture-validation failures (under unregisterface/<company>/)
const ZERO_FACES_FOLDER = '0_faces';
const MULTIPLE_FACES_FOLDER = 'multiple_faces';
// 1 face detected, but employee is not registered in the company DB
const UNREGISTER_EMP_FOLDER = 'unregister_emp';
// 1 face detected with partial similarity (within tolerance) but below LOW threshold
const SIMILAR_FACES_FOLDER = 'similar_faces';
// Recognition API call itself threw an error (network/5xx/timeout) — quarantined for review
const MISC_ERROR_FOLDER = 'misc_error';

module.exports = {
  ALLOWED_FILE_EXTENSIONS,
  MAX_FILE_SIZE,
  ALLOWED_IMAGE_TYPES,
  ALLOWED_DOCUMENT_TYPES,
  IMAGE_EXTENSIONS,
  UNREGISTER_FACE_FOLDER,
  ZERO_FACES_FOLDER,
  MULTIPLE_FACES_FOLDER,
  UNREGISTER_EMP_FOLDER,
  SIMILAR_FACES_FOLDER,
  MISC_ERROR_FOLDER
};

