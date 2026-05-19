import PropTypes from 'prop-types';
import { useRef, useEffect, useCallback, useState, useImperativeHandle, forwardRef } from 'react';
import { RotateCcw } from 'lucide-react';
import { useCameraDetection } from '../hooks/useCameraDetection';
import { useCameraStream } from '../hooks/useCameraStream';
import { useVideoRecording } from '../hooks/useVideoRecording';
import { useMediaCapture } from '../hooks/useMediaCapture';
import { useStreamCleanup } from '../hooks/useStreamCleanup';
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
 * Generic camera capture UI without face-detection awareness. Apps that need
 * face detection (or any other capture-time validation) compose this with
 * their own logic — see app/components/common/camera_capture for an example.
 *
 * variant="modal"  → preview + footer when wrapped in a modal
 * variant="inline" → no preview/footer, just onCapture (e.g. QuickCheckIn)
 */
const CameraCaptureContentBase = (
  props,
  ref
) => {
  const {
    onCapture,
    onClose,
    mode = 'photo',
    isActive = true,
    variant = 'modal',
    layout = 'centered', // 'centered' for modals, 'full' for wide layouts like QuickCheckIn
    showCaptureButton = true,
    /**
     * Optional pre-capture validator. Receives `{ videoRef, canvasRef, stream }` and returns a
     * truthy value (or resolves to one) when capture should proceed. Anything falsy aborts the
     * capture without calling onCapture / setting an error — the validator is expected to surface
     * its own UI hint via `preCaptureOverlay`. Used by the face-detection variant.
     */
    captureValidator,
    /** Render-prop for an overlay drawn inside `<CameraView>` (e.g. face rectangles). */
    cameraOverlay,
    /** Extra UI drawn over the camera preview (e.g. face guidance message). */
    preCaptureOverlay,
    /** Called from `handleClose` / `handleRetake` so callers can clear validator-related state. */
    onResetExtras,
    /**
     * Optional ref objects forwarded from a wrapper (e.g. the face-detection variant) so the
     * wrapper can read the live `<video>` / `<canvas>` elements from outside. Defaults to
     * internal refs; passing these does not change behavior here, it just shares identity.
     */
    externalVideoRef,
    externalCanvasRef,
    /** Fired whenever `stream` / `isVideoReady` change so wrappers can drive their own effects. */
    onCameraStateChange,
  } = props;
  const internalVideoRef = useRef(null);
  const internalCanvasRef = useRef(null);
  const videoRef = externalVideoRef ?? internalVideoRef;
  const canvasRef = externalCanvasRef ?? internalCanvasRef;
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

  const handleCapturePhoto = useCallback(async () => {
    if (captureValidator) {
      const ok = await captureValidator({ videoRef, canvasRef, stream });
      if (!ok) return;
    }
    const result = await capturePhoto(videoRef, canvasRef);
    if (result?.error) setError(result.error);
  }, [capturePhoto, setError, captureValidator, stream]);

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
    if (onResetExtras) onResetExtras();
    setError(null);
    setIsVideoReady(false);
    setIsCameraDetectionComplete(false);
    if (onClose) onClose();
  }, [stopAllStreams, cleanupRecording, cleanupCapturedMedia, onClose, setError, onResetExtras]);

  const handleRetake = useCallback(() => {
    retakeMedia();
    setError(null);
    setIsVideoReady(false);
    if (onResetExtras) onResetExtras();
    if (currentFacingMode) startCamera(currentFacingMode);
  }, [retakeMedia, currentFacingMode, startCamera, setError, onResetExtras]);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    if (onCameraStateChange) onCameraStateChange({ stream, isVideoReady });
  }, [stream, isVideoReady, onCameraStateChange]);

  useEffect(() => {
    if (!isActive) {
      stopAllStreams();
      if (onResetExtras) onResetExtras();
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
            showCaptureButton={showCaptureButton}
            containerClassName={props.cameraContainerClassName}
            overlay={cameraOverlay}
          />
        )}

        {!error && !stream && !isInitializing && !capturedMedia && isCameraDetectionComplete && (
          <NoCameraState />
        )}

        {showPreviewAndFooter && capturedMedia && (
          <CapturedMediaPreview capturedMedia={capturedMedia} mode={mode} />
        )}

        {!capturedMedia && preCaptureOverlay}
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
  isActive: PropTypes.bool,
  variant: PropTypes.oneOf(['modal', 'inline']),
  layout: PropTypes.oneOf(['centered', 'full']),
  showCaptureButton: PropTypes.bool,
  cameraContainerClassName: PropTypes.string,
  captureValidator: PropTypes.func,
  cameraOverlay: PropTypes.oneOfType([PropTypes.node, PropTypes.func]),
  preCaptureOverlay: PropTypes.node,
  onResetExtras: PropTypes.func,
  externalVideoRef: PropTypes.object,
  externalCanvasRef: PropTypes.object,
  onCameraStateChange: PropTypes.func,
};

CameraCaptureContent.propTypes = CameraCaptureContentBase.propTypes;

export { CameraCaptureContent };
