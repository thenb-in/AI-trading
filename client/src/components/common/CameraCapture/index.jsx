import PropTypes from 'prop-types';
import { useRef, useEffect, useCallback, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { MasterModal } from '@startup/base_components/master/MasterModal/MasterModal';
import { useCameraDetection } from './hooks/useCameraDetection';
import { useCameraStream } from './hooks/useCameraStream';
import { useVideoRecording } from './hooks/useVideoRecording';
import { useMediaCapture } from './hooks/useMediaCapture';
import { useStreamCleanup } from './hooks/useStreamCleanup';
import { getCameraStatusMessage } from './utils/cameraUtils';
import { ERROR_MESSAGES, POLLING_CONFIG } from './constants/cameraConstants';
import { LoadingState } from './components/LoadingState';
import { ErrorDisplay } from './components/ErrorDisplay';
import { StatusMessage } from './components/StatusMessage';
import { CameraView } from './components/CameraView';
import { CapturedMediaPreview } from './components/CapturedMediaPreview';
import { NoCameraState } from './components/NoCameraState';

/**
 * Supports photo and video capture with automatic camera detection
 */
const CameraCapture = ({ onCapture, onClose, isOpen, mode = 'photo' }) => {
  // Refs
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordingTimerRef = useRef(null);
  const mountedRef = useRef(true);

  // State
  const [isVideoReady, setIsVideoReady] = useState(false);
  const [isCameraDetectionComplete, setIsCameraDetectionComplete] = useState(false);

  // Custom hooks
  const { cameraCapabilities, setCameraCapabilities, detectAvailableCameras } = useCameraDetection();

  const { stopAllStreams, isCleaningUpRef } = useStreamCleanup(
    streamRef,
    videoRef,
    mediaRecorderRef,
    recordingTimerRef,
    mountedRef
  );

  const {
    stream,
    currentFacingMode,
    error,
    setError,
    permissionDenied,
    isInitializing,
    startCamera,
    switchCamera
  } = useCameraStream(mode, cameraCapabilities, stopAllStreams, streamRef, mountedRef, isCleaningUpRef);

  const {
    isRecording,
    recordingTime,
    startRecording: startVideoRecording,
    stopRecording,
    cleanupRecording
  } = useVideoRecording(stream, isVideoReady, (file) => {
    const previewUrl = URL.createObjectURL(file);
    setCapturedMedia(previewUrl);
    if (onCapture) {
      onCapture(file);
    }
  });

  const {
    capturedMedia,
    setCapturedMedia,
    capturePhoto,
    retakeMedia,
    cleanupCapturedMedia
  } = useMediaCapture(stream, isVideoReady, onCapture, mode);

  // Video event handlers
  const handleVideoLoadedMetadata = useCallback((e) => {
    const video = e.target;
    console.log('Video metadata loaded:', {
      width: video.videoWidth,
      height: video.videoHeight,
      readyState: video.readyState,
      paused: video.paused,
      srcObject: !!video.srcObject
    });
    if (video.videoWidth > 0 && video.videoHeight > 0) {
      setTimeout(() => {
        if (mountedRef.current) {
          setIsVideoReady(true);
        }
      }, 100);
      if (video.paused) {
        video.play().catch((err) => {
          console.warn('Play failed in onLoadedMetadata:', err);
        });
      }
    }
  }, []);

  const handleVideoCanPlay = useCallback((e) => {
    const video = e.target;
    console.log('Video can play:', {
      width: video.videoWidth,
      height: video.videoHeight,
      readyState: video.readyState
    });
    if (video.videoWidth > 0 && video.videoHeight > 0) {
      setTimeout(() => {
        if (mountedRef.current) {
          setIsVideoReady(true);
        }
      }, 100);
      if (video.paused) {
        video.play().catch((err) => {
          console.warn('Play failed in onCanPlay:', err);
        });
      }
    }
  }, []);

  const handleVideoPlaying = useCallback((e) => {
    const video = e.target;
    console.log('Video playing:', {
      width: video.videoWidth,
      height: video.videoHeight,
      paused: video.paused
    });
    if (video.videoWidth > 0 && video.videoHeight > 0) {
      if (mountedRef.current) {
        setIsVideoReady(true);
      }
    }
  }, []);

  const handleVideoOverlayClick = useCallback(() => {
    if (videoRef.current?.paused) {
      videoRef.current.play().catch(() => {});
    }
  }, []);

  const handleVideoError = useCallback((e) => {
    console.error('Video error:', e);
    setError(ERROR_MESSAGES.VIDEO_PLAYBACK_ERROR);
  }, [setError]);

  // Capture handlers
  const handleCapturePhoto = useCallback(async () => {
    const result = await capturePhoto(videoRef, canvasRef);
    if (result?.error) {
      setError(result.error);
    }
  }, [capturePhoto, setError]);

  const handleStartRecording = useCallback(() => {
    const result = startVideoRecording();
    if (result?.error) {
      setError(result.error);
    }
  }, [startVideoRecording, setError]);

  const handleStopRecording = useCallback(() => {
    stopRecording();
  }, [stopRecording]);

  // Handle modal close
  const handleClose = useCallback(() => {
    stopAllStreams();
    cleanupRecording();
    cleanupCapturedMedia();

    setError(null);
    setIsVideoReady(false);
    setIsCameraDetectionComplete(false);

    if (onClose) {
      onClose();
    }
  }, [stopAllStreams, cleanupRecording, cleanupCapturedMedia, onClose, setError]);

  // Handle retake
  const handleRetake = useCallback(() => {
    retakeMedia();
    setError(null);
    setIsVideoReady(false);

    if (currentFacingMode) {
      startCamera(currentFacingMode);
    }
  }, [retakeMedia, currentFacingMode, startCamera, setError]);

  // Effect: Mount/unmount tracking
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Effect: Detect cameras and start when modal opens
  useEffect(() => {
    if (!isOpen) {
      stopAllStreams();
      cleanupCapturedMedia();
      setIsCameraDetectionComplete(false);
      return;
    }

    let isCancelled = false;

    const initializeCamera = async () => {
      try {
        console.log('Initializing camera...');
        const capabilities = await detectAvailableCameras();
        console.log('Camera capabilities detected:', capabilities);
        
        if (isCancelled || !mountedRef.current) return;

        setCameraCapabilities(capabilities);
        setIsCameraDetectionComplete(true);

        if (capabilities.totalCameras > 0) {
          console.log('Starting camera with capabilities:', capabilities);
          await startCamera();
        } else {
          console.warn('No cameras found');
          setError(ERROR_MESSAGES.NO_CAMERAS_FOUND);
        }
      } catch (err) {
        if (!isCancelled && mountedRef.current) {
          console.error('Camera initialization error:', err);
          setError(ERROR_MESSAGES.INITIALIZATION_FAILED);
          setIsCameraDetectionComplete(true);
        }
      }
    };

    const timer = setTimeout(() => {
      initializeCamera();
    }, 100);

    return () => {
      isCancelled = true;
      clearTimeout(timer);
      stopAllStreams();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Effect: Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAllStreams();
      cleanupCapturedMedia();
    };
  }, [stopAllStreams, cleanupCapturedMedia]);

  // Effect: Attach stream to video element when both are ready
  useEffect(() => {
    if (!stream || !videoRef.current || capturedMedia) return;

    console.log('Attaching stream to video element');
    const video = videoRef.current;
    const currentStream = stream;

    // Attach stream
    video.srcObject = currentStream;

    // Try to play
    const playVideo = async () => {
      try {
        await video.play();
        console.log('Video playing successfully');
        if (mountedRef.current) {
          setIsVideoReady(true);
        }
      } catch (playError) {
        console.warn('Autoplay blocked (will play on interaction):', playError.message);
      }
    };

    playVideo();

    return () => {
      if (video.srcObject === currentStream) {
        video.srcObject = null;
      }
    };
  }, [stream, capturedMedia]);

  // Effect: Poll for video readiness as fallback
  useEffect(() => {
    if (!stream || isVideoReady || capturedMedia) return;

    let checkCount = 0;

    const checkVideoReady = () => {
      checkCount++;
      
      if (videoRef.current && 
          videoRef.current.videoWidth > 0 && 
          videoRef.current.videoHeight > 0) {
        
        if (videoRef.current.readyState >= 2) {
          setIsVideoReady(true);
          
          if (videoRef.current.paused) {
            videoRef.current.play().catch(() => {});
          }
          return true;
        }
      }
      
      if (checkCount >= POLLING_CONFIG.MAX_CHECKS && videoRef.current?.videoWidth > 0) {
        setIsVideoReady(true);
        return true;
      }
      
      return false;
    };

    if (checkVideoReady()) return;

    const interval = setInterval(() => {
      if (checkVideoReady()) {
        clearInterval(interval);
      }
    }, POLLING_CONFIG.INTERVAL_MS);

    return () => {
      clearInterval(interval);
    };
  }, [stream, isVideoReady, capturedMedia]);

  // Determine if camera switch is available
  const canSwitchCamera = cameraCapabilities.hasFrontCamera && 
                          cameraCapabilities.hasBackCamera && 
                          !isRecording && 
                          !capturedMedia;

  const statusMessage = getCameraStatusMessage(cameraCapabilities);

  // Modal actions
  const modalActions = (
    <>
      <button
        onClick={handleClose}
        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
      >
        Cancel
      </button>

      {capturedMedia && (
        <>
          <button
            onClick={handleRetake}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <RotateCcw className="inline-block w-4 h-4 mr-2" />
            Retake
          </button>
          <button
            onClick={handleClose}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Use {mode === 'photo' ? 'Photo' : 'Video'}
          </button>
        </>
      )}
    </>
  );

  return (
    <MasterModal
      isOpen={isOpen}
      onClose={handleClose}
      title={mode === 'photo' ? 'Take Photo' : 'Record Video'}
      actions={modalActions}
      size="lg"
    >
      <div className="space-y-3">
        {/* Status Message - Outside camera view */}
        <StatusMessage message={statusMessage && !error && !capturedMedia ? statusMessage : null} />

        {/* Error Display - Outside camera view */}
        <ErrorDisplay
          error={error}
          permissionDenied={permissionDenied}
          onRequestPermission={() => startCamera(currentFacingMode)}
        />

        <div className="relative bg-black rounded-lg overflow-hidden min-h-[400px]">
          {/* Initial Loading State */}
          {isInitializing && !stream && (
            <LoadingState message="Starting camera..." />
          )}

          {/* Camera View */}
          {!error && !capturedMedia && (
            <CameraView
              videoRef={videoRef}
              canvasRef={canvasRef}
              stream={stream}
              isVideoReady={isVideoReady}
              isInitializing={isInitializing}
              isRecording={isRecording}
              recordingTime={recordingTime}
              canSwitchCamera={canSwitchCamera}
              onSwitchCamera={switchCamera}
              onVideoLoadedMetadata={handleVideoLoadedMetadata}
              onVideoCanPlay={handleVideoCanPlay}
              onVideoPlaying={handleVideoPlaying}
              onVideoError={handleVideoError}
              onOverlayClick={handleVideoOverlayClick}
              mode={mode}
              onCapturePhoto={handleCapturePhoto}
              onStartRecording={handleStartRecording}
              onStopRecording={handleStopRecording}
            />
          )}

          {/* No Camera State */}
          {!error && !stream && !isInitializing && !capturedMedia && isCameraDetectionComplete && (
            <NoCameraState />
          )}

          {/* Captured Media Preview */}
          {capturedMedia && (
            <CapturedMediaPreview capturedMedia={capturedMedia} mode={mode} />
          )}
        </div>
      </div>
    </MasterModal>
  );
};

CameraCapture.propTypes = {
  onCapture: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
  isOpen: PropTypes.bool.isRequired,
  mode: PropTypes.oneOf(['photo', 'video'])
};

export { CameraCapture };
export default CameraCapture;

