import { useState, useCallback } from 'react';
import { ERROR_MESSAGES } from '../constants/cameraConstants';

/**
 * Custom hook for photo and video capture
 */
const useMediaCapture = (stream, isVideoReady, onCapture) => {
  const [capturedMedia, setCapturedMedia] = useState(null);

  const capturePhoto = useCallback(async (videoRef, canvasRef) => {
    if (!videoRef.current || !canvasRef.current || !stream) {
      return { error: ERROR_MESSAGES.CAMERA_NOT_READY };
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;

    // Ensure video is ready
    if (!isVideoReady || video.videoWidth === 0 || video.videoHeight === 0) {
      return { error: ERROR_MESSAGES.CAMERA_LOADING };
    }

    try {
      const context = canvas.getContext('2d');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // Mirror horizontally to match the mirrored preview (-scale-x-100 on <video>)
      context.translate(canvas.width, 0);
      context.scale(-1, 1);
      context.drawImage(video, 0, 0);

      // Convert to blob
      const blob = await new Promise((resolve, reject) => {
        canvas.toBlob(
          (blob) => {
            if (blob) resolve(blob);
            else reject(new Error('Failed to create image blob'));
          },
          'image/jpeg',
          0.92
        );
      });

      const file = new File([blob], `photo-${Date.now()}.jpg`, { type: 'image/jpeg' });
      const previewUrl = URL.createObjectURL(blob);

      setCapturedMedia(previewUrl);

      if (onCapture) {
        onCapture(file);
      }

      return { file, previewUrl };
    } catch (err) {
      console.error('Photo capture error:', err);
      return { error: ERROR_MESSAGES.PHOTO_CAPTURE_FAILED };
    }
  }, [stream, isVideoReady, onCapture]);

  const retakeMedia = useCallback(() => {
    if (capturedMedia) {
      URL.revokeObjectURL(capturedMedia);
    }
    setCapturedMedia(null);
  }, [capturedMedia]);

  const cleanupCapturedMedia = useCallback(() => {
    if (capturedMedia) {
      URL.revokeObjectURL(capturedMedia);
      setCapturedMedia(null);
    }
  }, [capturedMedia]);

  return {
    capturedMedia,
    setCapturedMedia,
    capturePhoto,
    retakeMedia,
    cleanupCapturedMedia
  };
};

export { useMediaCapture };

