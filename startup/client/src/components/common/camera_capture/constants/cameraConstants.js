/**
 * Camera-related constants
 */

const CAMERA_MODES = {
  PHOTO: 'photo',
  VIDEO: 'video'
};

const FACING_MODES = {
  USER: 'user',
  ENVIRONMENT: 'environment'
};

const VIDEO_MIME_TYPES = [
  'video/webm;codecs=vp9,opus',
  'video/webm;codecs=vp8,opus',
  'video/webm;codecs=h264,opus',
  'video/webm',
  'video/mp4'
];

const CAMERA_CONSTRAINTS = {
  width: { ideal: 1280 },
  height: { ideal: 720 }
};

const ERROR_MESSAGES = {
  BROWSER_NOT_SUPPORTED: 'Camera access is not supported in this browser. Please use a modern browser like Chrome, Firefox, or Safari.',
  FRONT_CAMERA_NOT_AVAILABLE: 'Front camera is not available on this device.',
  BACK_CAMERA_NOT_AVAILABLE: 'Back camera is not available on this device.',
  PERMISSION_DENIED: 'Camera access denied. Please allow camera access in your browser settings and try again.',
  NO_CAMERA_FOUND: 'No camera found on this device.',
  CAMERA_IN_USE: 'Camera is already in use by another application. Please close other apps using the camera.',
  CAMERA_NOT_READY: 'Camera is not ready. Please wait and try again.',
  CAMERA_LOADING: 'Camera is still loading. Please wait a moment.',
  RECORDING_NOT_READY: 'Camera is not ready for recording.',
  RECORDING_NOT_SUPPORTED: 'Video recording is not supported in this browser.',
  NO_VIDEO_TRACK: 'No video track available.',
  RECORDING_ERROR: 'Recording error occurred. Please try again.',
  NO_VIDEO_DATA: 'No video data recorded. Please try again.',
  PHOTO_CAPTURE_FAILED: 'Failed to capture photo. Please try again.',
  VIDEO_PLAYBACK_ERROR: 'Video playback error. Please try again.',
  INITIALIZATION_FAILED: 'Failed to initialize camera.',
  NO_CAMERAS_FOUND: 'No cameras found on this device.'
};

const CAMERA_LABEL_KEYWORDS = {
  FRONT: ['front', 'user', 'face'],
  BACK: ['back', 'rear', 'environment']
};

const POLLING_CONFIG = {
  MAX_CHECKS: 15,
  INTERVAL_MS: 200,
  CLEANUP_DELAY_MS: 100
};

export { CAMERA_MODES, FACING_MODES, VIDEO_MIME_TYPES, CAMERA_CONSTRAINTS, ERROR_MESSAGES, CAMERA_LABEL_KEYWORDS, POLLING_CONFIG };

