import { Camera } from 'lucide-react';

/**
 * No camera available state component
 */
const NoCameraState = () => {
  return (
    <div className="flex items-center justify-center py-32 text-gray-400">
      <div className="text-center">
        <Camera className="w-16 h-16 mx-auto mb-4 opacity-50" />
        <p className="text-lg">Camera not available</p>
      </div>
    </div>
  );
};

export { NoCameraState };

