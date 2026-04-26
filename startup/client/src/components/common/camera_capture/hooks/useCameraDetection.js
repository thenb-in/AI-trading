import { useState, useCallback } from 'react';
import { isFrontCameraLabel, isBackCameraLabel } from '../utils/cameraUtils';

/**
 * Custom hook for detecting available cameras
 */
const useCameraDetection = () => {
  const [cameraCapabilities, setCameraCapabilities] = useState({
    hasFrontCamera: false,
    hasBackCamera: false,
    totalCameras: 0,
    detectionComplete: false
  });

  const detectAvailableCameras = useCallback(async () => {
    const capabilities = {
      hasFrontCamera: false,
      hasBackCamera: false,
      totalCameras: 0,
      detectionComplete: false
    };

    try {
      // Check if getUserMedia is available
      if (!navigator.mediaDevices?.getUserMedia) {
        capabilities.detectionComplete = true;
        return capabilities;
      }

      // Try to enumerate devices first (more reliable, doesn't require permission)
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(device => device.kind === 'videoinput');
        capabilities.totalCameras = videoDevices.length;

        if (capabilities.totalCameras === 0) {
          capabilities.detectionComplete = true;
          return capabilities;
        }

        // If we have device info, check labels for hints
        const hasLabels = videoDevices.some(device => device.label);
        if (hasLabels) {
          capabilities.hasFrontCamera = videoDevices.some(device =>
            isFrontCameraLabel(device.label)
          );
          capabilities.hasBackCamera = videoDevices.some(device =>
            isBackCameraLabel(device.label)
          );

          // If labels don't help, assume we have at least front camera
          if (!capabilities.hasFrontCamera && !capabilities.hasBackCamera) {
            capabilities.hasFrontCamera = true;
            if (capabilities.totalCameras > 1) {
              capabilities.hasBackCamera = true;
            }
          }

          capabilities.detectionComplete = true;
          return capabilities;
        }

        // If no labels (permission not granted yet), assume we have cameras
        // Permission will be requested when startCamera() is called
        if (capabilities.totalCameras > 0) {
          capabilities.hasFrontCamera = true;
          if (capabilities.totalCameras > 1) {
            capabilities.hasBackCamera = true;
          }
          capabilities.detectionComplete = true;
          return capabilities;
        }
      } catch (err) {
        console.warn('Device enumeration failed:', err);
      }

      // If enumeration completely failed, assume at least one camera exists
      // Permission will be requested when startCamera() is called
      capabilities.hasFrontCamera = true;
      capabilities.totalCameras = 1;

      capabilities.detectionComplete = true;
      return capabilities;
    } catch (err) {
      console.error('Camera detection error:', err);
      capabilities.detectionComplete = true;
      return capabilities;
    }
  }, []);

  return {
    cameraCapabilities,
    setCameraCapabilities,
    detectAvailableCameras
  };
};

export { useCameraDetection };

