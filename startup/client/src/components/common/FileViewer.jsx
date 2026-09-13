import PropTypes from 'prop-types';
import { ZoomIn, ZoomOut, RotateCw, Maximize2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useImageZoom } from '@/hooks/useImageZoom';
import { getFileType } from '@utils/file_management/fileTypeUtils';
import { loadFile } from '@utils/file_management/fileLoader';
import {
  ImageViewer,
  PdfViewer,
  VideoViewer,
  AudioViewer,
  UnsupportedViewer,
} from './file_viewer';

/**
 * A file shown with the viewer its type needs, under a title bar with zoom
 * controls for images. Fills its parent — FileViewerModal puts it in a popup,
 * a record's details view can put it inline. `headerActions` sit at the right
 * of the title bar (a close button, a download button).
 */
const FileViewer = ({ fileUrl, mimeType, title = 'View File', onLoadError, onDownload, headerActions = null }) => {
  const [blobUrl, setBlobUrl] = useState('');
  const [effectiveMime, setEffectiveMime] = useState(mimeType || '');
  const [loadError, setLoadError] = useState(null);

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
  } = useImageZoom(true);

  // Load the file whenever it changes
  useEffect(() => {
    let revokedUrl = '';
    setLoadError(null);

    const load = async () => {
      if (!fileUrl) return;
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
  }, [fileUrl, mimeType, onLoadError]);

  const fileType = useMemo(() => getFileType(effectiveMime, fileUrl), [effectiveMime, fileUrl]);
  const isImage = fileType === 'image';

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
        return <UnsupportedViewer fileType={fileType} fileName={title} onDownload={onDownload} />;

      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-full min-h-0">
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
          {headerActions}
        </div>
      </div>
      <div className="flex-1 bg-gray-50 overflow-hidden">
        {renderFileContent()}
      </div>
    </div>
  );
};

FileViewer.propTypes = {
  fileUrl: PropTypes.string,
  mimeType: PropTypes.string,
  title: PropTypes.string,
  onLoadError: PropTypes.func,
  // Supplied only by callers that can download the file being viewed, already
  // gated on whatever permission guards their own download control. The viewer
  // stays free of permission logic: no handler, no button.
  onDownload: PropTypes.func,
  headerActions: PropTypes.node,
};

export { FileViewer };
