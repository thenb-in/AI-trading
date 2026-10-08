import { useState } from 'react';
import PropTypes from 'prop-types';
import { Camera, ImagePlus, UploadCloud } from 'lucide-react';

const BUTTON_CLASS = 'inline-flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-60';

/** An empty card side: drop a photo on it, upload one, or take one. */
const DocumentCardEmpty = ({ disabled, onUpload, onCamera, onDropFile }) => {
  const [dragging, setDragging] = useState(false);

  const handleDragOver = (event) => {
    event.preventDefault();
    if (!disabled) setDragging(true);
  };
  const handleDragLeave = () => setDragging(false);
  const handleDrop = (event) => {
    event.preventDefault();
    setDragging(false);
    const dropped = event.dataTransfer.files?.[0];
    if (!disabled && dropped?.type.startsWith('image/')) onDropFile(dropped);
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`flex h-full w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-3 text-center transition-colors ${
        dragging ? 'border-indigo-400 bg-indigo-50' : 'border-gray-300 bg-white'
      }`}
    >
      <UploadCloud className={`h-7 w-7 ${dragging ? 'text-indigo-500' : 'text-gray-400'}`} />
      <p className="text-xs text-gray-500">Drag a photo here, or</p>
      <div className="flex gap-2">
        <button type="button" onClick={onUpload} disabled={disabled} className={BUTTON_CLASS}>
          <ImagePlus className="h-3.5 w-3.5" /> Upload
        </button>
        <button type="button" onClick={onCamera} disabled={disabled} className={BUTTON_CLASS}>
          <Camera className="h-3.5 w-3.5" /> Camera
        </button>
      </div>
    </div>
  );
};

DocumentCardEmpty.propTypes = {
  disabled: PropTypes.bool,
  onUpload: PropTypes.func.isRequired,
  onCamera: PropTypes.func.isRequired,
  onDropFile: PropTypes.func.isRequired,
};

export { DocumentCardEmpty };
