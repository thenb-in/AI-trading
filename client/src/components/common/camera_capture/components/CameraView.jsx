import PropTypes from 'prop-types';
import { useRef } from 'react';
import { SwitchCamera, Camera, Video, Square } from 'lucide-react';
import { formatTime } from '../utils/formatUtils';
import { FaceDetectionOverlay } from './FaceDetectionOverlay';

/**
 * Camera view component with video element and controls
 */
const CameraView = ({
  videoRef,
  canvasRef,
  stream,
  isVideoReady,
  isInitializing,
  isRecording,
  recordingTime,
  canSwitchCamera,
  onSwitchCamera,
  onVideoLoadedMetadata,
  onVideoCanPlay,
  onVideoPlaying,
  onVideoError,
  onOverlayClick,
  mode,
  onCapturePhoto,
  onStartRecording,
  onStopRecording,
  enableFaceDetection = false,
  faceRects = [],
  showCaptureButton = true,
  containerClassName,
}) => {
  const containerRef = useRef(null);

  if (!stream) return null;

  return (
    <div
      ref={containerRef}
      className={containerClassName || 'relative w-full aspect-[3/4] sm:aspect-video bg-black'}
    >
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="absolute inset-0 w-full h-full object-cover block"
        onLoadedMetadata={onVideoLoadedMetadata}
        onCanPlay={onVideoCanPlay}
        onPlaying={onVideoPlaying}
        onError={onVideoError}
      />
      <canvas ref={canvasRef} className="hidden" />

      {/* Professional face alignment overlay */}
      <div className="pointer-events-none absolute inset-0">
        {/* Subtle vignette */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/60" />

        {/* Centered oval frame, with minimal space below */}
        <div className="absolute inset-0 flex items-center justify-center pb-3 sm:pb-4">
          <div className="relative h-3/4 w-3/4 max-w-sm">
            <div className="absolute inset-0 rounded-full border-[3px] border-white/80 shadow-[0_0_40px_rgba(0,0,0,0.6)]" />
            {/* Top and bottom markers */}
            <div className="absolute inset-x-12 -top-1 h-0.5 bg-white/70 rounded-full" />
            <div className="absolute inset-x-12 -bottom-1 h-0.5 bg-white/70 rounded-full" />
          </div>
        </div>
      </div>

      <FaceDetectionOverlay
        enableFaceDetection={enableFaceDetection}
        faceRects={faceRects}
        containerRef={containerRef}
      />

      {/* Loading Overlay - Only show on initial load */}
      {!isVideoReady && (
        <div 
          className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 cursor-pointer"
          onClick={onOverlayClick}
        >
          <div className="text-white text-sm text-center px-4">
            <div className="mb-2">Preparing camera...</div>
            {!isInitializing && (
              <div className="text-xs text-gray-300">Tap here if camera doesn&apos;t start</div>
            )}
          </div>
        </div>
      )}

      {/* Recording Indicator */}
      {isRecording && (
        <div className="absolute top-3 sm:top-4 left-1/2 -translate-x-1/2 bg-red-600 text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-full flex items-center space-x-2 shadow-lg text-xs sm:text-sm">
          <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-white rounded-full animate-pulse" />
          <span className="font-mono font-semibold">{formatTime(recordingTime)}</span>
        </div>
      )}

      {/* Switch Camera Button */}
      {canSwitchCamera && (
        <button
          onClick={onSwitchCamera}
          disabled={isInitializing || !isVideoReady}
          className="absolute top-3 sm:top-4 right-3 sm:right-4 p-2.5 sm:p-3 bg-black/60 text-white rounded-full hover:bg-black/80 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          title="Switch Camera"
        >
          <SwitchCamera className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>
      )}

      {/* Action Buttons */}
      {showCaptureButton && !isInitializing && isVideoReady && (
        <div className="absolute bottom-0 left-0 right-0 px-4 sm:px-6 pb-4 sm:pb-6 pt-10 bg-gradient-to-t from-black/90 via-black/40 to-transparent">
          <div className="flex justify-center">
            {mode === 'photo' ? (
              <button
                onClick={onCapturePhoto}
                disabled={!isVideoReady}
                className="p-3.5 sm:p-4 bg-white rounded-full hover:bg-gray-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-xl"
                title="Capture Photo"
              >
                <Camera className="w-7 h-7 sm:w-8 sm:h-8 text-gray-800" />
              </button>
            ) : (
              <>
                {!isRecording ? (
                  <button
                    onClick={onStartRecording}
                    disabled={!isVideoReady}
                    className="p-4 bg-red-600 rounded-full hover:bg-red-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-xl"
                    title="Start Recording"
                  >
                    <Video className="w-8 h-8 text-white" />
                  </button>
                ) : (
                  <button
                    onClick={onStopRecording}
                    className="p-4 bg-white rounded-full hover:bg-gray-100 transition-all shadow-xl"
                    title="Stop Recording"
                  >
                    <Square className="w-8 h-8 text-red-600 fill-current" />
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

CameraView.propTypes = {
  videoRef: PropTypes.object.isRequired,
  canvasRef: PropTypes.object.isRequired,
  stream: PropTypes.object,
  isVideoReady: PropTypes.bool.isRequired,
  isInitializing: PropTypes.bool.isRequired,
  isRecording: PropTypes.bool.isRequired,
  recordingTime: PropTypes.number.isRequired,
  canSwitchCamera: PropTypes.bool.isRequired,
  onSwitchCamera: PropTypes.func.isRequired,
  onVideoLoadedMetadata: PropTypes.func.isRequired,
  onVideoCanPlay: PropTypes.func.isRequired,
  onVideoPlaying: PropTypes.func.isRequired,
  onVideoError: PropTypes.func.isRequired,
  onOverlayClick: PropTypes.func.isRequired,
  mode: PropTypes.oneOf(['photo', 'video']).isRequired,
  onCapturePhoto: PropTypes.func.isRequired,
  onStartRecording: PropTypes.func,
  onStopRecording: PropTypes.func,
  enableFaceDetection: PropTypes.bool,
  faceRects: PropTypes.arrayOf(
    PropTypes.shape({
      left: PropTypes.number,
      top: PropTypes.number,
      width: PropTypes.number,
      height: PropTypes.number,
    })
  ),
  showCaptureButton: PropTypes.bool,
  containerClassName: PropTypes.string,
};

export { CameraView };

