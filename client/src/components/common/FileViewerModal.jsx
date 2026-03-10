import PropTypes from 'prop-types';
import { X, ZoomIn, ZoomOut, RotateCw, Maximize2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useEscapeKey } from '../../hooks/useEscapeKey';
import { useImageZoom } from '../../hooks/useImageZoom';
import { getFileType } from '../../utils/fileManagement/fileTypeUtils';
import { loadFile } from '../../utils/fileManagement/fileLoader';
import {
  ImageViewer,
  PdfViewer,
  VideoViewer,
  AudioViewer,
  UnsupportedViewer,
} from './FileViewer';

/**
 * File Viewer Modal Component
 * Displays files in a modal with appropriate viewer based on file type
 */
const FileViewerModal = ({ isOpen, onClose, fileUrl, mimeType, title = 'View File', onLoadError }) => {
  const [blobUrl, setBlobUrl] = useState('');
  const [effectiveMime, setEffectiveMime] = useState(mimeType || '');
  const [loadError, setLoadError] = useState(null);

  // Image zoom controls (only used for images)
  const imageZoomHook = useImageZoom(isOpen);
  const {
    imageZoom,
    imagePosition,
    isDragging,
    imageRef,
    containerRef,
    handleZoomIn,
    handleZoomOut,
    handleResetZoom,
    handleFitToScreen,
    handleWheel,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
  } = imageZoomHook;

  // Handle escape key to close modal
  useEscapeKey(onClose, isOpen);

  // Load file when modal opens or file changes
  useEffect(() => {
    let revokedUrl = '';
    setLoadError(null);

    const load = async () => {
      if (!isOpen || !fileUrl) return;
      try {
        const { blobUrl: loadedBlobUrl, mimeType: loadedMimeType } = await loadFile(fileUrl, mimeType);
        setBlobUrl(loadedBlobUrl);
        setEffectiveMime(loadedMimeType);
        if (loadedBlobUrl.startsWith('blob:')) {
          revokedUrl = loadedBlobUrl;
        }
      } catch (err) {
        const msg = err?.error || err?.message || 'Something went wrong. File may have been deleted or is unavailable.';
        setLoadError(msg);
        setBlobUrl('');
        if (onLoadError) onLoadError(msg);
      }
    };

    load();

    return () => {
      if (revokedUrl) {
        URL.revokeObjectURL(revokedUrl);
      }
      setBlobUrl('');
      setLoadError(null);
    };
  }, [isOpen, fileUrl, mimeType, onLoadError]);

  // Determine file type
  const fileType = useMemo(() => getFileType(effectiveMime, fileUrl), [effectiveMime, fileUrl]);
  const isImage = fileType === 'image';

  if (!isOpen) return null;

  const renderFileContent = () => {
    if (loadError) {
      return (
        <div className="flex flex-col items-center justify-center h-full p-6 text-center">
          <p className="text-red-600 font-medium">Unable to load file</p>
          <p className="text-sm text-gray-500 mt-1">{loadError}</p>
        </div>
      );
    }
    switch (fileType) {
      case 'pdf':
        return <PdfViewer blobUrl={blobUrl} fileUrl={fileUrl} />;
      
      case 'image':
        return (
          <ImageViewer
            blobUrl={blobUrl}
            fileUrl={fileUrl}
            title={title}
            imageZoom={imageZoom}
            imagePosition={imagePosition}
            isDragging={isDragging}
            imageRef={imageRef}
            containerRef={containerRef}
            handleWheel={handleWheel}
            handleMouseDown={handleMouseDown}
            handleMouseMove={handleMouseMove}
            handleMouseUp={handleMouseUp}
          />
        );
      
      case 'video':
        return <VideoViewer blobUrl={blobUrl} fileUrl={fileUrl} />;
      
      case 'audio':
        return <AudioViewer blobUrl={blobUrl} fileUrl={fileUrl} title={title} />;
      
      case 'excel':
      case 'csv':
      case 'unknown':
        return <UnsupportedViewer />;
      
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[1000]">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl h-[80vh] mx-4 flex flex-col">
        <div className="flex items-center justify-between p-3 border-b border-gray-200">
          <div className="text-sm font-medium text-gray-700 truncate pr-2 flex-1">{title}</div>
          <div className="flex items-center gap-2">
            {isImage && (
              <>
                <button
                  onClick={handleZoomOut}
                  className="p-1.5 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded"
                  title="Zoom Out"
                  disabled={imageZoom <= 0.5}
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <button
                  onClick={handleZoomIn}
                  className="p-1.5 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded"
                  title="Zoom In"
                  disabled={imageZoom >= 5}
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <button
                  onClick={handleFitToScreen}
                  className="p-1.5 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded"
                  title="Fit to Screen"
                >
                  <Maximize2 className="w-4 h-4" />
                </button>
                <button
                  onClick={handleResetZoom}
                  className="p-1.5 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded"
                  title="Reset Zoom"
                >
                  <RotateCw className="w-4 h-4" />
                </button>
              </>
            )}
            <button onClick={onClose} className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        <div className="flex-1 bg-gray-50 overflow-hidden">
          {renderFileContent()}
        </div>
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
};

export { FileViewerModal };


