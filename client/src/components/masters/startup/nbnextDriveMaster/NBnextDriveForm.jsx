import PropTypes from 'prop-types';
import { useState, useEffect, useRef } from 'react';
import { Upload, X, Camera, Video } from 'lucide-react';
import { CameraCapture } from '@/components/common/CameraCapture';
import { TextField } from '@startup/safe_choice';

const NBnextDriveForm = ({ formData, onChange, onFileChange }) => {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraMode, setCameraMode] = useState('photo');
  const [previewUrl, setPreviewUrl] = useState(null);
  const previewUrlRef = useRef(null);

  const handleFileSelect = (file) => {
    if (file) {
      // Clean up previous preview URL
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }
      
      setSelectedFile(file);
      onFileChange(file);
      
      // Create new preview URL for images
      if (file.type && file.type.startsWith('image/')) {
        const url = URL.createObjectURL(file);
        setPreviewUrl(url);
        previewUrlRef.current = url;
      } else {
        setPreviewUrl(null);
        previewUrlRef.current = null;
      }
    }
  };

  const handleCameraCapture = (file) => {
    if (file) {
      // Clean up previous preview URL
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }
      
      setSelectedFile(file);
      onFileChange(file);
      
      // Create new preview URL for images and videos
      if (file.type && (file.type.startsWith('image/') || file.type.startsWith('video/'))) {
        const url = URL.createObjectURL(file);
        setPreviewUrl(url);
        previewUrlRef.current = url;
      } else {
        setPreviewUrl(null);
        previewUrlRef.current = null;
      }
    }
  };

  const handleOpenCamera = (mode = 'photo') => {
    setCameraMode(mode);
    setIsCameraOpen(true);
  };

  const handleCloseCamera = () => {
    setIsCameraOpen(false);
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const handleRemoveFile = () => {
    // Clean up preview URL
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
    setSelectedFile(null);
    setPreviewUrl(null);
    onFileChange(null);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }
    };
  }, []);

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          File *
        </label>
        <div
          className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
            dragActive
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-300 hover:border-gray-400'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          {selectedFile ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Upload className="h-5 w-5 text-gray-500" />
                  <div className="text-left">
                    <p className="text-sm font-medium text-gray-900">{selectedFile.name}</p>
                    <p className="text-xs text-gray-500">{formatFileSize(selectedFile.size)}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleRemoveFile}
                  className="text-red-500 hover:text-red-700"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              {previewUrl && selectedFile.type && (
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
            </div>
          ) : (
            <div>
              <Upload className="mx-auto h-12 w-12 text-gray-400" />
              <p className="mt-2 text-sm text-gray-600">
                Drag and drop a file here, or click to select
              </p>
              <p className="mt-1 text-xs text-gray-500">Any file type supported (max 100MB)</p>
              <div className="mt-4 flex items-center justify-center gap-3">
                <input
                  type="file"
                  onChange={handleFileInputChange}
                  className="hidden"
                  id="file-upload"
                  accept="*/*"
                />
                <label
                  htmlFor="file-upload"
                  className="inline-block px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 cursor-pointer"
                >
                  Select File
                </label>
                <button
                  type="button"
                  onClick={() => handleOpenCamera('photo')}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-green-600 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
                >
                  <Camera className="h-4 w-4" />
                  Take Photo
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenCamera('video')}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-purple-600 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
                >
                  <Video className="h-4 w-4" />
                  Record Video
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <CameraCapture
        isOpen={isCameraOpen}
        onCapture={handleCameraCapture}
        onClose={handleCloseCamera}
        mode={cameraMode}
      />

      <div>
        <TextField
          type="text"
          name="objectName"
          label="Object Name"
          value={formData.objectName || ''}
          onChange={(e) => onChange('objectName', e.target.value)}
          placeholder="Enter object name (optional)"
        />
      </div>

      <div>
        <TextField
          type="text"
          name="objectId"
          label="Object ID"
          value={formData.objectId || ''}
          onChange={(e) => onChange('objectId', e.target.value)}
          placeholder="Enter object ID (optional)"
        />
      </div>
    </div>
  );
};

NBnextDriveForm.propTypes = {
  formData: PropTypes.shape({
    objectName: PropTypes.string,
    objectId: PropTypes.string
  }).isRequired,
  onChange: PropTypes.func.isRequired,
  onFileChange: PropTypes.func.isRequired
};

export { NBnextDriveForm };

