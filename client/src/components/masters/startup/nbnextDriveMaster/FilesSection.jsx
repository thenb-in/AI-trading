import PropTypes from 'prop-types';
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Upload, X, Camera, Video, Eye } from 'lucide-react';
import { CameraCapture } from '@/components/common/CameraCapture';
import { FileViewerModal } from '@/components/common/FileViewerModal';

/**
 * Reusable file upload section: drag-drop, select file(s), preview, camera/video.
 * Used by NBnextDriveForm and NBnextDriveAttachment.
 * When multiple=true: selectedFiles is File[], onFileChange(files). Otherwise single file.
 */
const FilesSection = ({
  selectedFile,
  selectedFiles,
  onFileChange,
  accept = '*/*',
  hint = 'Any file type supported (max 100MB)',
  showCamera = true,
  disabled = false,
  multiple = false
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraMode, setCameraMode] = useState('photo');
  const [previewUrl, setPreviewUrl] = useState(null);
  const previewUrlRef = useRef(null);
  const [viewerState, setViewerState] = useState({ open: false, blobUrl: '', mimeType: '', title: '' });
  const viewerBlobUrlRef = useRef(null);

  const files = useMemo(
    () => (multiple ? (selectedFiles || []) : (selectedFile ? [selectedFile] : [])),
    [multiple, selectedFile, selectedFiles]
  );
  const hasFiles = files.length > 0;

  useEffect(() => {
    if (!multiple && selectedFile?.type?.startsWith('image/')) {
      const url = URL.createObjectURL(selectedFile);
      setPreviewUrl(url);
      previewUrlRef.current = url;
      return () => {
        URL.revokeObjectURL(url);
        previewUrlRef.current = null;
      };
    }
    if (!multiple && selectedFile?.type?.startsWith('video/')) {
      const url = URL.createObjectURL(selectedFile);
      setPreviewUrl(url);
      previewUrlRef.current = url;
      return () => {
        URL.revokeObjectURL(url);
        previewUrlRef.current = null;
      };
    }
    setPreviewUrl(null);
    previewUrlRef.current = null;
    return () => {};
  }, [multiple, selectedFile]);

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }
      if (viewerBlobUrlRef.current) {
        URL.revokeObjectURL(viewerBlobUrlRef.current);
      }
    };
  }, []);

  const handleFilesAdd = useCallback(
    (newFiles) => {
      if (!newFiles || newFiles.length === 0) return;
      if (multiple) {
        const next = [...(selectedFiles || []), ...Array.from(newFiles)];
        onFileChange(next);
      } else {
        onFileChange(newFiles[0]);
      }
    },
    [multiple, selectedFiles, onFileChange]
  );

  const handleFileSelect = useCallback(
    (file) => {
      if (file) {
        if (multiple) handleFilesAdd([file]);
        else onFileChange(file);
      } else if (!multiple) {
        onFileChange(null);
      }
    },
    [multiple, onFileChange, handleFilesAdd]
  );

  const handleCameraCapture = useCallback(
    (file) => {
      if (file) {
        if (multiple) handleFilesAdd([file]);
        else onFileChange(file);
      }
    },
    [multiple, onFileChange, handleFilesAdd]
  );

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  };

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);
      const dropped = e.dataTransfer.files;
      if (dropped?.length) {
        if (multiple) handleFilesAdd(dropped);
        else handleFileSelect(dropped[0]);
      }
    },
    [multiple, handleFilesAdd, handleFileSelect]
  );

  const handleRemoveFile = useCallback(
    (indexToRemove) => {
      if (multiple && selectedFiles?.length) {
        const next = selectedFiles.filter((_, i) => i !== indexToRemove);
        onFileChange(next.length ? next : null);
      } else {
        onFileChange(null);
      }
    },
    [multiple, selectedFiles, onFileChange]
  );

  const handleRemoveClick = useCallback(
    (e) => {
      const index = e.currentTarget.dataset.index;
      if (index === undefined) return;
      handleRemoveFile(Number(index));
    },
    [handleRemoveFile]
  );

  const handleViewFile = useCallback((file) => {
    if (!file || !(file instanceof File)) return;
    if (viewerBlobUrlRef.current) {
      URL.revokeObjectURL(viewerBlobUrlRef.current);
      viewerBlobUrlRef.current = null;
    }
    const blobUrl = URL.createObjectURL(file);
    viewerBlobUrlRef.current = blobUrl;
    setViewerState({ open: true, blobUrl, mimeType: file.type || '', title: file.name || 'View File' });
  }, []);

  const handleViewClick = useCallback(
    (e) => {
      const index = e.currentTarget.dataset.index;
      if (index === undefined) return;
      const file = files[Number(index)];
      if (file) handleViewFile(file);
    },
    [files, handleViewFile]
  );

  const handleCloseViewer = useCallback(() => {
    if (viewerBlobUrlRef.current) {
      URL.revokeObjectURL(viewerBlobUrlRef.current);
      viewerBlobUrlRef.current = null;
    }
    setViewerState({ open: false, blobUrl: '', mimeType: '', title: '' });
  }, []);

  const formatFileSize = (bytes) => {
    if (bytes == null || bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  const handleFileInputChange = useCallback(
    (e) => {
      const fileList = e.target.files;
      if (!fileList?.length) {
        e.target.value = '';
        return;
      }
      const arr = Array.from(fileList);
      if (multiple) handleFilesAdd(arr);
      else handleFileSelect(arr[0]);
      e.target.value = '';
    },
    [multiple, handleFilesAdd, handleFileSelect]
  );

  const handleOpenCameraPhoto = useCallback(() => {
    setCameraMode('photo');
    setIsCameraOpen(true);
  }, []);

  const handleOpenCameraVideo = useCallback(() => {
    setCameraMode('video');
    setIsCameraOpen(true);
  }, []);

  const handleCloseCamera = useCallback(() => {
    setIsCameraOpen(false);
  }, []);

  const fileInputRef = useRef(null);
  const fileInputId = useMemo(() => `filesection-input-${Math.random().toString(36).slice(2)}`, []);
  const handleOpenFileDialog = useCallback(() => {
    if (disabled) return;
    fileInputRef.current?.click();
  }, [disabled]);

  const handleDropZoneClick = useCallback(
    (e) => {
      if (e.target.closest('button')) return;
      if (disabled) return;
      handleOpenFileDialog();
    },
    [disabled, handleOpenFileDialog]
  );

  const handleDropZoneKeyDown = useCallback(
    (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (disabled) return;
        handleOpenFileDialog();
      }
    },
    [disabled, handleOpenFileDialog]
  );

  return (
    <div>
      <input
        id={fileInputId}
        type="file"
        accept={accept}
        {...(multiple ? { multiple: true } : {})}
        ref={fileInputRef}
        className="sr-only"
        onChange={handleFileInputChange}
        aria-hidden
      />
      <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor={fileInputId}>
        File
      </label>
      <div
        role="button"
        tabIndex={0}
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer ${
          dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
        } ${disabled ? 'opacity-60 pointer-events-none' : ''}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={handleDropZoneClick}
        onKeyDown={handleDropZoneKeyDown}
      >
        {hasFiles ? (
          <div className="space-y-3">
            {files.map((file, index) => (
              <div key={index} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                <div className="flex items-center space-x-3 min-w-0">
                  <Upload className="h-5 w-5 text-gray-500 shrink-0" />
                  <div className="text-left min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                    <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1 ml-2">
                  <button
                    type="button"
                    data-index={index}
                    onClick={handleViewClick}
                    className="rounded p-1 text-gray-600 hover:bg-gray-100"
                    title="View"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                  {!disabled && (
                    <button
                      type="button"
                      data-index={index}
                      onClick={handleRemoveClick}
                      className="text-red-500 hover:text-red-700 rounded p-1 hover:bg-red-50"
                      title="Remove"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
            {!multiple && previewUrl && selectedFile?.type && (
              <div className="mt-3 rounded-lg overflow-hidden border border-gray-200">
                {selectedFile.type.startsWith('image/') ? (
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="w-full h-auto max-h-64 object-contain bg-gray-50"
                  />
                ) : selectedFile.type.startsWith('video/') ? (
                  <video
                    src={previewUrl}
                    controls
                    className="w-full h-auto max-h-64 object-contain bg-gray-50"
                  />
                ) : null}
              </div>
            )}
            <div className="mt-2 flex items-center justify-center gap-3 flex-wrap">
              <button
                type="button"
                onClick={handleOpenFileDialog}
                className="inline-block px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100"
              >
                {multiple ? 'Add more files' : 'Change file'}
              </button>
              {showCamera && (
                <>
                  <button
                    type="button"
                    onClick={handleOpenCameraPhoto}
                    className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-green-600 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
                  >
                    <Camera className="h-4 w-4" />
                    Take Photo
                  </button>
                  <button
                    type="button"
                    onClick={handleOpenCameraVideo}
                    className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-purple-600 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
                  >
                    <Video className="h-4 w-4" />
                    Record Video
                  </button>
                </>
              )}
            </div>
          </div>
        ) : (
          <div>
            <Upload className="mx-auto h-12 w-12 text-gray-400" />
            <p className="mt-2 text-sm text-gray-600">
              {multiple ? 'Drag and drop files here, or click to select multiple' : 'Drag and drop a file here, or click to select'}
            </p>
            <p className="mt-1 text-xs text-gray-500">{hint}</p>
            <div className="mt-4 flex items-center justify-center gap-3 flex-wrap">
              <button
                type="button"
                onClick={handleOpenFileDialog}
                className="inline-block px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100"
              >
                {multiple ? 'Select Files' : 'Select File'}
              </button>
              {showCamera && (
                <>
                  <button
                    type="button"
                    onClick={handleOpenCameraPhoto}
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-green-600 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
                  >
                    <Camera className="h-4 w-4" />
                    Take Photo
                  </button>
                  <button
                    type="button"
                    onClick={handleOpenCameraVideo}
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-purple-600 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
                  >
                    <Video className="h-4 w-4" />
                    Record Video
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {showCamera && (
        <CameraCapture
          isOpen={isCameraOpen}
          onCapture={handleCameraCapture}
          onClose={handleCloseCamera}
          mode={cameraMode}
        />
      )}

      <FileViewerModal
        isOpen={viewerState.open}
        onClose={handleCloseViewer}
        fileUrl={viewerState.blobUrl}
        mimeType={viewerState.mimeType}
        title={viewerState.title}
      />
    </div>
  );
};

FilesSection.propTypes = {
  selectedFile: PropTypes.instanceOf(File),
  selectedFiles: PropTypes.arrayOf(PropTypes.instanceOf(File)),
  onFileChange: PropTypes.func.isRequired,
  accept: PropTypes.string,
  hint: PropTypes.string,
  showCamera: PropTypes.bool,
  disabled: PropTypes.bool,
  multiple: PropTypes.bool
};

export { FilesSection };
