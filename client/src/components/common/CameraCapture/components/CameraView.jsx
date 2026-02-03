import PropTypes from 'prop-types';
import { SwitchCamera, Camera, Video, Square } from 'lucide-react';
import { formatTime } from '../utils/formatUtils';

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
  onStopRecording
}) => {
  if (!stream) return null;

  return (
    <div className="relative w-full aspect-video bg-black">
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
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-red-600 text-white px-4 py-2 rounded-full flex items-center space-x-2 shadow-lg">
          <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
          <span className="font-mono font-semibold">{formatTime(recordingTime)}</span>
        </div>
      )}

      {/* Switch Camera Button */}
      {canSwitchCamera && (
        <button
          onClick={onSwitchCamera}
          disabled={isInitializing || !isVideoReady}
          className="absolute top-4 right-4 p-3 bg-black bg-opacity-50 text-white rounded-full hover:bg-opacity-75 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          title="Switch Camera"
        >
          <SwitchCamera className="w-5 h-5" />
        </button>
      )}

      {/* Action Buttons */}
      {!isInitializing && isVideoReady && (
        <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black to-transparent">
          <div className="flex justify-center">
            {mode === 'photo' ? (
              <button
                onClick={onCapturePhoto}
                disabled={!isVideoReady}
                className="p-4 bg-white rounded-full hover:bg-gray-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-xl"
                title="Capture Photo"
              >
                <Camera className="w-8 h-8 text-gray-800" />
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
  onStopRecording: PropTypes.func
};

export { CameraView };

