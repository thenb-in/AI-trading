import PropTypes from 'prop-types';
import { X } from 'lucide-react';
import { useEscapeKey } from '@/hooks/useEscapeKey';
import { FileViewer } from './FileViewer';

/**
 * File Viewer Modal Component
 * Displays a file in a popup, with the viewer its type needs.
 */
const FileViewerModal = ({ isOpen, onClose, ...viewerProps }) => {
  useEscapeKey(onClose, isOpen);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[1000]">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl h-[80vh] mx-4 flex flex-col overflow-hidden">
        <FileViewer
          {...viewerProps}
          headerActions={(
            <button onClick={onClose} className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded">
              <X className="w-5 h-5" />
            </button>
          )}
        />
      </div>
    </div>
  );
};

FileViewerModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  fileUrl: PropTypes.string,
  mimeType: PropTypes.string,
  title: PropTypes.string,
  onLoadError: PropTypes.func,
  onDownload: PropTypes.func,
};

export { FileViewerModal };
