import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import PropTypes from 'prop-types';
import { toast } from 'react-toastify';

const QRCodeScanner = ({ onScanSuccess, onClose, isOpen, heading, message }) => {
  const scannerRef = useRef(null);
  const html5QrCodeRef = useRef(null);
  const isTransitioningRef = useRef(false);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isOpen) {
      stopScanning();
      return;
    }

    // Small delay to ensure DOM is ready
    const timer = setTimeout(() => {
      if (isOpen && !html5QrCodeRef.current && !isTransitioningRef.current) {
        startScanning();
      }
    }, 300);

    return () => {
      clearTimeout(timer);
      stopScanning();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const startScanning = async () => {
    if (isTransitioningRef.current || html5QrCodeRef.current) {
      return;
    }

    try {
      isTransitioningRef.current = true;
      setError(null);
      setIsScanning(true);

      const html5QrCode = new Html5Qrcode('qr-reader');
      html5QrCodeRef.current = html5QrCode;

      // Try multiple strategies to start the camera (preferring back camera)
      let lastError = null;
      const configs = [];

      // Strategy 1: Try to get back camera by ID (preferred for mobile)
      try {
        const cameras = await Html5Qrcode.getCameras();
        // Find back camera by checking labels
        const backCamera = cameras.find(camera => {
          const label = camera.label.toLowerCase();
          return label.includes('back') || 
                 label.includes('rear') ||
                 label.includes('environment') ||
                 label.includes('facing back') ||
                 label.includes('camera2'); // Android often uses camera2 for back camera
        });
        if (backCamera) {
          configs.push({ deviceId: backCamera.id });
        }
      } catch {
        // Camera enumeration failed, continue with other strategies
      }

      // Strategy 2: Use facingMode 'environment' (back camera on mobile)
      // This is the standard way to request back camera on mobile devices
      configs.push({ facingMode: 'environment' });

      // Strategy 3: Use facingMode with exact constraint (strict back camera)
      configs.push({ facingMode: { exact: 'environment' } });

      // Calculate responsive qrbox size based on screen width
      const getQRBoxSize = () => {
        const width = window.innerWidth;
        if (width < 640) {
          // Mobile: use 80% of screen width, max 280px
          return Math.min(width * 0.8, 280);
        } else if (width < 1024) {
          // Tablet: medium size
          return 300;
        }
        // Desktop: larger size
        return 350;
      };

      const qrboxSize = getQRBoxSize();

      // Try each configuration until one works
      for (const config of configs) {
        try {
          await html5QrCode.start(
            config,
            {
              fps: 10,
              qrbox: { width: qrboxSize, height: qrboxSize },
              aspectRatio: 1.0,
            },
            (decodedText) => {
              handleScanSuccess(decodedText);
            },
            () => {
              // Ignore scanning errors, they're normal during scanning
            }
          );
          // Success! Camera started
          isTransitioningRef.current = false;
          return;
        } catch (configError) {
          lastError = configError;
          // Try next configuration
          continue;
        }
      }

      // If all configurations failed, throw the last error
      throw lastError || new Error('Failed to start camera with any configuration');
    } catch (err) {
      isTransitioningRef.current = false;
      setIsScanning(false);
      html5QrCodeRef.current = null;
      
      const errorMessage = err.message || 'Unknown error';
      
      // Provide more specific error messages
      if (errorMessage.includes('NotAllowedError') || errorMessage.includes('Permission')) {
        setError('Camera permission denied. Please allow camera access in your browser settings.');
        toast.error('Camera permission denied. Please allow camera access.');
      } else if (errorMessage.includes('NotFoundError') || errorMessage.includes('No camera')) {
        setError('No camera found. Please ensure your device has a camera.');
        toast.error('No camera found on your device.');
      } else if (errorMessage.includes('NotReadableError') || errorMessage.includes('already in use')) {
        setError('Camera is already in use by another application.');
        toast.error('Camera is already in use. Please close other applications using the camera.');
      } else {
        setError('Failed to start camera. Please try again.');
        if (!errorMessage.includes('transition')) {
          toast.error('Failed to start camera. Please try again.');
        }
      }
    }
  };

  const stopScanning = async () => {
    if (!html5QrCodeRef.current) {
      return;
    }

    if (isTransitioningRef.current) {
      // Already transitioning, wait a bit and try again
      setTimeout(() => {
        if (html5QrCodeRef.current) {
          stopScanning();
        }
      }, 200);
      return;
    }

    try {
      isTransitioningRef.current = true;
      const scanner = html5QrCodeRef.current;
      
      await scanner.stop();
      scanner.clear();
      html5QrCodeRef.current = null;
      isTransitioningRef.current = false;
      setIsScanning(false);
    } catch {
      // Ignore transition errors - scanner might already be stopped or transitioning
      if (html5QrCodeRef.current) {
        try {
          html5QrCodeRef.current.clear();
        } catch {
          // Ignore clear errors
        }
        html5QrCodeRef.current = null;
      }
      isTransitioningRef.current = false;
      setIsScanning(false);
    }
  };

  const handleScanSuccess = (decodedText) => {
    if (onScanSuccess) {
      onScanSuccess(decodedText);
    }
    // Stop scanning after a short delay to allow callback to complete
    setTimeout(() => {
      stopScanning();
    }, 100);
  };

  if (!isOpen) return null;

  return (
    <div className="flex flex-col items-center p-2 sm:p-4 w-full">
      {heading && (
        <div className="mb-3 sm:mb-4 text-center w-full px-2">
          <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-1 sm:mb-2">
            {heading}
          </h3>
          {message && (
            <p className="text-xs sm:text-sm text-red-600">
              {message}
            </p>
          )}
        </div>
      )}

      {!heading && (
        <div className="mb-3 sm:mb-4 text-center w-full px-2">
          <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-1 sm:mb-2">
            Scan QR Code
          </h3>
          <p className="text-xs sm:text-sm text-gray-600">
            Point your camera at the QR code
          </p>
        </div>
      )}

      {error && (
        <div className="mb-3 sm:mb-4 p-2 sm:p-3 bg-red-50 border border-red-200 rounded-lg w-full mx-2">
          <p className="text-xs sm:text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Scanning Instructions */}
      <div className="mb-3 sm:mb-4 w-full max-w-md mx-auto">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4">
          <div className="flex items-start space-x-2 sm:space-x-3">
            <svg className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="flex-1">
              <p className="text-xs sm:text-sm text-blue-800 font-medium mb-1">Scanning Tips:</p>
              <ul className="text-xs text-blue-700 space-y-0.5 list-disc list-inside">
                <li>Ensure good lighting conditions</li>
                <li>Hold your device steady</li>
                <li>Position QR code within the frame</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Scanner View */}
      <div className="relative w-full max-w-md mx-auto">
        <div
          id="qr-reader"
          ref={scannerRef}
          className="w-full min-h-[250px] sm:min-h-[300px] rounded-lg overflow-hidden border-2 border-gray-300 shadow-inner"
        />
        {isScanning && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="border-2 border-blue-500 rounded-lg w-[80%] max-w-[280px] aspect-square animate-pulse shadow-lg" />
          </div>
        )}
        {!isScanning && !error && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-gray-400 text-sm">Initializing camera...</div>
          </div>
        )}
      </div>

      {/* Action Button */}
      <button
        onClick={onClose}
        className="mt-4 sm:mt-6 w-full sm:w-auto px-6 sm:px-4 py-2.5 sm:py-2 bg-gray-600 text-white text-sm sm:text-base rounded-lg hover:bg-gray-700 active:bg-gray-800 transition-colors font-medium shadow-sm hover:shadow-md"
      >
        Cancel
      </button>
    </div>
  );
};

QRCodeScanner.propTypes = {
  onScanSuccess: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
  isOpen: PropTypes.bool.isRequired,
  heading: PropTypes.string,
  message: PropTypes.string,
};

export { QRCodeScanner };

