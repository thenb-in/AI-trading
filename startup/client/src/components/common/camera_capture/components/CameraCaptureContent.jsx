import PropTypes from 'prop-types';
import { useRef, useEffect, useCallback, useState, useImperativeHandle, forwardRef } from 'react';
import { RotateCcw } from 'lucide-react';
import { useCameraDetection } from '../hooks/useCameraDetection';
import { useCameraStream } from '../hooks/useCameraStream';
import { useVideoRecording } from '../hooks/useVideoRecording';
import { useMediaCapture } from '../hooks/useMediaCapture';
import { useStreamCleanup } from '../hooks/useStreamCleanup';
// import { useFaceDetection } from '../hooks/useFaceDetection';
import { useVideoElementHandlers } from '../hooks/useVideoElementHandlers';
import { getCameraStatusMessage } from '../utils/cameraUtils';
import { ERROR_MESSAGES, POLLING_CONFIG } from '../constants/cameraConstants';
import { LoadingState } from './LoadingState';
import { ErrorDisplay } from './ErrorDisplay';
import { StatusMessage } from './StatusMessage';
import { CameraView } from './CameraView';
import { CapturedMediaPreview } from './CapturedMediaPreview';
import { NoCameraState } from './NoCameraState';


/**
 * Core camera capture UI and logic without a modal.
 * Use variant="modal" when wrapping in a modal (shows preview + footer).
 * Use variant="inline" for inline usage (e.g. QuickCheckIn) - no preview/footer, just onCapture.
 */
const CameraCaptureContentBase = (
  props,
  ref
) => {
  const {
    onCapture,
    onClose,
    mode = 'photo',
    enableFaceDetection = false,
    isActive = true,
    variant = 'modal',
    layout = 'centered', // 'centered' for modals, 'full' for wide layouts like QuickCheckIn
    showCaptureButton = true,
  } = props;
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordingTimerRef = useRef(null);
  const mountedRef = useRef(true);

  const [isVideoReady, setIsVideoReady] = useState(false);
  const [isCameraDetectionComplete, setIsCameraDetectionComplete] = useState(false);

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

  const handleVideoCapture = useCallback(
    (file) => {
      if (onCapture) onCapture(file);
    },
    [onCapture]
  );

  const {
    isRecording,
    recordingTime,
    startRecording: startVideoRecording,
    stopRecording,
    cleanupRecording
  } = useVideoRecording(stream, isVideoReady, (file) => {
    const previewUrl = URL.createObjectURL(file);
    setCapturedMedia(previewUrl);
    handleVideoCapture(file);
  });

  const {
    capturedMedia,
    setCapturedMedia,
    capturePhoto,
    retakeMedia,
    cleanupCapturedMedia
  } = useMediaCapture(stream, isVideoReady, variant === 'inline' ? handleVideoCapture : onCapture, mode);

  // const {
  //   faceGuidance,
  //   faceGuidanceTone,
  //   faceRects,
  //   runCaptureValidation,
  //   resetFaceGuidance,
  // } = useFaceDetection({
  //   enabled: enableFaceDetection && mode === 'photo',
  //   videoRef,
  //   canvasRef,
  //   stream,
  //   isVideoReady,
  //   capturedMedia,
  // });

  const handleCapturePhoto = useCallback(async () => {
    if (mode !== 'photo' || !enableFaceDetection) {
      const result = await capturePhoto(videoRef, canvasRef);
      if (result?.error) setError(result.error);
      return;
    }

    if (!videoRef.current || !canvasRef.current) {
      setError('Camera not ready');
      return;
    }
    const result = await capturePhoto(videoRef, canvasRef);
    if (result?.error) setError(result.error);
  }, [capturePhoto, setError, mode, enableFaceDetection]);

  const {
    handleVideoLoadedMetadata,
    handleVideoCanPlay,
    handleVideoPlaying,
    handleVideoOverlayClick,
    handleVideoError,
  } = useVideoElementHandlers({
    videoRef,
    mountedRef,
    setIsVideoReady,
    setError,
  });

  useImperativeHandle(
    ref,
    () => ({
      capturePhoto: handleCapturePhoto,
    }),
    [handleCapturePhoto]
  );

  const handleStartRecording = useCallback(() => {
    const result = startVideoRecording();
    if (result?.error) setError(result.error);
  }, [startVideoRecording, setError]);

  const handleStopRecording = useCallback(() => stopRecording(), [stopRecording]);

  const handleClose = useCallback(() => {
    stopAllStreams();
    cleanupRecording();
    cleanupCapturedMedia();
    setError(null);
    setIsVideoReady(false);
    setIsCameraDetectionComplete(false);
    if (onClose) onClose();
  }, [stopAllStreams, cleanupRecording, cleanupCapturedMedia, onClose, setError]);

  const handleRetake = useCallback(() => {
    retakeMedia();
    setError(null);
    setIsVideoReady(false);
    if (currentFacingMode) startCamera(currentFacingMode);
  }, [retakeMedia, currentFacingMode, startCamera, setError]);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    if (!isActive) {
      stopAllStreams();
      cleanupCapturedMedia();
      setIsCameraDetectionComplete(false);
      return;
    }

    let isCancelled = false;
    const initializeCamera = async () => {
      try {
        const capabilities = await detectAvailableCameras();
        if (isCancelled || !mountedRef.current) return;
        setCameraCapabilities(capabilities);
        setIsCameraDetectionComplete(true);
        if (capabilities.totalCameras > 0) {
          await startCamera();
        } else {
          setError(ERROR_MESSAGES.NO_CAMERAS_FOUND);
        }
      } catch {
        if (!isCancelled && mountedRef.current) {
          setError(ERROR_MESSAGES.INITIALIZATION_FAILED);
          setIsCameraDetectionComplete(true);
        }
      }
    };

    const timer = setTimeout(initializeCamera, 100);
    return () => {
      isCancelled = true;
      clearTimeout(timer);
      stopAllStreams();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive]);

  useEffect(() => {
    return () => {
      stopAllStreams();
      cleanupCapturedMedia();
    };
  }, [stopAllStreams, cleanupCapturedMedia]);

  useEffect(() => {
    if (!stream || !videoRef.current || capturedMedia) return;
    const video = videoRef.current;
    const currentStream = stream;
    video.srcObject = currentStream;
    const playVideo = async () => {
      try {
        await video.play();
        if (mountedRef.current) setIsVideoReady(true);
      } catch {
        // Autoplay blocked, will play on interaction
      }
    };
    playVideo();
    return () => {
      if (video.srcObject === currentStream) video.srcObject = null;
    };
  }, [stream, capturedMedia]);

  useEffect(() => {
    if (!stream || isVideoReady || capturedMedia) return;
    let checkCount = 0;
    const checkVideoReady = () => {
      checkCount++;
      if (videoRef.current?.videoWidth > 0 && videoRef.current?.videoHeight > 0) {
        if (videoRef.current.readyState >= 2) {
          setIsVideoReady(true);
          if (videoRef.current.paused) videoRef.current.play().catch(() => {});
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
      if (checkVideoReady()) clearInterval(interval);
    }, POLLING_CONFIG.INTERVAL_MS);
    return () => clearInterval(interval);
  }, [stream, isVideoReady, capturedMedia]);

  const canSwitchCamera =
    cameraCapabilities.hasFrontCamera &&
    cameraCapabilities.hasBackCamera &&
    !isRecording &&
    !capturedMedia;

  const statusMessage = getCameraStatusMessage(cameraCapabilities);
  const showPreviewAndFooter = variant === 'modal';
  const containerClass =
    layout === 'full'
      ? 'w-full space-y-2 sm:space-y-3'
      : 'w-full max-w-2xl mx-auto space-y-2 sm:space-y-3';

  return (
    <div className={containerClass}>
      <div className="flex justify-center px-2">
        <StatusMessage
          message={statusMessage && !error && !capturedMedia ? statusMessage : null}
        />
      </div>

      <div className="px-2 sm:px-0">
        <ErrorDisplay
          error={error}
          permissionDenied={permissionDenied}
          onRequestPermission={() => startCamera(currentFacingMode)}
        />
      </div>

      <div className="relative bg-black rounded-xl overflow-hidden min-h-[260px] sm:min-h-[320px] md:min-h-[380px] lg:min-h-[420px]">
        {isInitializing && !stream && <LoadingState message="Starting camera..." />}

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
            enableFaceDetection={enableFaceDetection}
            showCaptureButton={showCaptureButton}
            containerClassName={props.cameraContainerClassName}
          />
        )}

        {!error && !stream && !isInitializing && !capturedMedia && isCameraDetectionComplete && (
          <NoCameraState />
        )}

        {showPreviewAndFooter && capturedMedia && (
          <CapturedMediaPreview capturedMedia={capturedMedia} mode={mode} />
        )}

      </div>

      {showPreviewAndFooter && capturedMedia && (
        <div className="flex flex-wrap gap-2 justify-end pt-3 sm:pt-4 px-2 sm:px-0">
          <button
            type="button"
            onClick={handleRetake}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <RotateCcw className="inline-block w-4 h-4 mr-2" />
            Retake
          </button>
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Use {mode === 'photo' ? 'Photo' : 'Video'}
          </button>
        </div>
      )}
    </div>
  );
};

const CameraCaptureContent = forwardRef(CameraCaptureContentBase);

CameraCaptureContentBase.propTypes = {
  onCapture: PropTypes.func.isRequired,
  onClose: PropTypes.func,
  mode: PropTypes.oneOf(['photo', 'video']),
  enableFaceDetection: PropTypes.bool,
  isActive: PropTypes.bool,
  variant: PropTypes.oneOf(['modal', 'inline']),
  layout: PropTypes.oneOf(['centered', 'full']),
  showCaptureButton: PropTypes.bool,
  cameraContainerClassName: PropTypes.string,
};

CameraCaptureContent.propTypes = CameraCaptureContentBase.propTypes;

export { CameraCaptureContent };
