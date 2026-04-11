import { Camera } from 'lucide-react';

/**
 * No camera available state component
 */
const NoCameraState = () => {
  return (
    <div className="flex items-center justify-center py-16 sm:py-24 text-gray-400 px-4">
      <div className="text-center">
        <Camera className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 opacity-50" />
        <p className="text-sm sm:text-base md:text-lg">Camera not available</p>
      </div>
    </div>
  );
};

export { NoCameraState };

