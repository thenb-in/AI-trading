import PropTypes from "prop-types";
import { useCallback } from "react";
import { AlertTriangle } from "lucide-react";
import { useEscapeKey } from "@/hooks/useEscapeKey.js";

const LargeDatasetWarningDialog = ({ isOpen, onConfirm, onCancel, cellCount }) => {
  // Handle escape key to close dialog
  useEscapeKey(onCancel, isOpen);

  // Handle backdrop click to close dialog
  const handleBackdropClick = useCallback((e) => {
    if (e.target === e.currentTarget) {
      onCancel();
    }
  }, [onCancel]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50"
      onClick={handleBackdropClick}
    >
      <div 
        className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center mb-4">
          <AlertTriangle className="text-yellow-500 mr-3" size={24} />
          <h2 className="text-xl font-bold">Large Dataset Warning</h2>
        </div>
        <div className="mb-6">
          <p className="text-gray-700 mb-3">
            This dataset contains {cellCount.toLocaleString()} cells. Entering fullscreen mode might slow down the experience for large datasets.
          </p>
          <p className="text-blue-700 font-semibold">
            Consider applying filters to reduce the dataset size before entering fullscreen.
          </p>
        </div>
        <div className="flex justify-end space-x-4">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-md text-gray-700 bg-gray-200 hover:bg-gray-300 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-colors"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
};

LargeDatasetWarningDialog.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onConfirm: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
  cellCount: PropTypes.number.isRequired,
};

export { LargeDatasetWarningDialog };

