import { useState, useCallback } from 'react';
import { ERROR_MESSAGES, CAMERA_CONSTRAINTS, FACING_MODES } from '../constants/cameraConstants';

/**
 * Custom hook for managing camera stream
 */
const useCameraStream = (mode, cameraCapabilities, stopAllStreams, streamRef, mountedRef, isCleaningUpRef) => {
  const [stream, setStream] = useState(null);
  const [currentFacingMode, setCurrentFacingMode] = useState(null);
  const [error, setError] = useState(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);

  const startCamera = useCallback(async (requestedFacingMode = null) => {
    if (!mountedRef.current || isCleaningUpRef.current) return;

    try {
      setError(null);
      setPermissionDenied(false);
      
      if (!stream) {
        setIsInitializing(true);
      }

      // Check browser support
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('BROWSER_NOT_SUPPORTED');
      }

      // Stop existing stream
      stopAllStreams();

      // Wait a bit for cleanup
      await new Promise(resolve => setTimeout(resolve, 100));

      if (!mountedRef.current) return;

      // Determine facing mode
      let facingMode = requestedFacingMode;
      
      if (!facingMode) {
        // Choose default based on available cameras
        if (cameraCapabilities.hasFrontCamera) {
          facingMode = FACING_MODES.USER;
        } else if (cameraCapabilities.hasBackCamera) {
          facingMode = FACING_MODES.ENVIRONMENT;
        } else {
          facingMode = FACING_MODES.USER; // Fallback
        }
      }

      // Validate requested facing mode
      if (facingMode === FACING_MODES.USER && !cameraCapabilities.hasFrontCamera && cameraCapabilities.detectionComplete) {
        throw new Error('FRONT_CAMERA_NOT_AVAILABLE');
      }
      if (facingMode === FACING_MODES.ENVIRONMENT && !cameraCapabilities.hasBackCamera && cameraCapabilities.detectionComplete) {
        throw new Error('BACK_CAMERA_NOT_AVAILABLE');
      }

      // Build constraints
      const constraints = {
        video: {
          facingMode: facingMode,
          ...CAMERA_CONSTRAINTS
        },
        ...(mode === 'video' && { audio: true })
      };

      let mediaStream;

      try {
        // Try with facing mode constraint
        mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (constraintError) {
        // If specific facing mode fails, try without it
        if (constraintError.name === 'OverconstrainedError' || constraintError.name === 'NotFoundError') {
          // Try without facingMode - just get any camera
          const simpleConstraints = {
            video: true,
            ...(mode === 'video' && { audio: true })
          };
          mediaStream = await navigator.mediaDevices.getUserMedia(simpleConstraints);
          facingMode = FACING_MODES.USER; // Assume front camera
        } else {
          throw constraintError;
        }
      }

      if (!mountedRef.current) {
        mediaStream.getTracks().forEach(track => track.stop());
        return;
      }

      // Store stream
      streamRef.current = mediaStream;
      setStream(mediaStream);
      setCurrentFacingMode(facingMode);

      console.log('Camera stream obtained:', {
        videoTracks: mediaStream.getVideoTracks().length,
        audioTracks: mediaStream.getAudioTracks().length,
        facingMode
      });

      if (mountedRef.current) {
        setIsInitializing(false);
      }
    } catch (err) {
      if (!mountedRef.current) return;

      setIsInitializing(false);
      console.error('Camera start error:', err);

      // Handle specific errors
      if (err.message === 'BROWSER_NOT_SUPPORTED') {
        setError(ERROR_MESSAGES.BROWSER_NOT_SUPPORTED);
      } else if (err.message === 'FRONT_CAMERA_NOT_AVAILABLE') {
        setError(ERROR_MESSAGES.FRONT_CAMERA_NOT_AVAILABLE);
      } else if (err.message === 'BACK_CAMERA_NOT_AVAILABLE') {
        setError(ERROR_MESSAGES.BACK_CAMERA_NOT_AVAILABLE);
      } else if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setPermissionDenied(true);
        setError(ERROR_MESSAGES.PERMISSION_DENIED);
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setError(ERROR_MESSAGES.NO_CAMERA_FOUND);
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        setError(ERROR_MESSAGES.CAMERA_IN_USE);
      } else {
        setError(`Unable to access camera: ${err.message || 'Unknown error'}`);
      }
    }
  }, [mode, stopAllStreams, cameraCapabilities, stream]);

  const switchCamera = useCallback(() => {
    const { hasFrontCamera, hasBackCamera } = cameraCapabilities;

    // Determine target facing mode
    const targetFacingMode = currentFacingMode === FACING_MODES.USER 
      ? FACING_MODES.ENVIRONMENT 
      : FACING_MODES.USER;

    // Check if target camera is available
    if (targetFacingMode === FACING_MODES.USER && !hasFrontCamera) {
      setError(ERROR_MESSAGES.FRONT_CAMERA_NOT_AVAILABLE);
      return;
    }
    if (targetFacingMode === FACING_MODES.ENVIRONMENT && !hasBackCamera) {
      setError(ERROR_MESSAGES.BACK_CAMERA_NOT_AVAILABLE);
      return;
    }

    // Start camera with new facing mode
    startCamera(targetFacingMode);
  }, [currentFacingMode, cameraCapabilities, startCamera]);

  return {
    stream,
    setStream,
    currentFacingMode,
    error,
    setError,
    permissionDenied,
    isInitializing,
    streamRef,
    mountedRef,
    isCleaningUpRef,
    startCamera,
    switchCamera
  };
};

export { useCameraStream };

