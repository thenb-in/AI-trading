import { useCallback } from 'react';
import { ERROR_MESSAGES } from '../constants/cameraConstants';

/**
 * Shared hook to create video element event handlers:
 * - loadedmetadata / canplay / playing → mark video as ready and try to play
 * - overlay click → resume video
 * - error → set a standardized playback error
 */
const useVideoElementHandlers = ({ videoRef, mountedRef, setIsVideoReady, setError }) => {
  const handleVideoReadyCheck = useCallback(
    (e) => {
      const video = e.target;
      if (video.videoWidth > 0 && video.videoHeight > 0) {
        setTimeout(() => {
          if (mountedRef.current) {
            setIsVideoReady(true);
          }
        }, 100);
        if (video.paused) {
          video.play().catch(() => {});
        }
      }
    },
    [mountedRef, setIsVideoReady],
  );

  // Both loadedmetadata and canplay use the same readiness check
  const handleVideoLoadedMetadata = handleVideoReadyCheck;
  const handleVideoCanPlay = handleVideoReadyCheck;

  const handleVideoPlaying = useCallback(
    (e) => {
      const video = e.target;
      if (video.videoWidth > 0 && video.videoHeight > 0 && mountedRef.current) {
        setIsVideoReady(true);
      }
    },
    [mountedRef, setIsVideoReady],
  );

  const handleVideoOverlayClick = useCallback(() => {
    if (videoRef.current?.paused) {
      videoRef.current.play().catch(() => {});
    }
  }, [videoRef]);

  const handleVideoError = useCallback(() => {
    setError(ERROR_MESSAGES.VIDEO_PLAYBACK_ERROR);
  }, [setError]);

  return {
    handleVideoLoadedMetadata,
    handleVideoCanPlay,
    handleVideoPlaying,
    handleVideoOverlayClick,
    handleVideoError,
  };
};

export { useVideoElementHandlers };

