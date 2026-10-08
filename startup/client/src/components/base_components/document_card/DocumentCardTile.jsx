import { useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { Check, IdCard, Loader2, Trash2 } from 'lucide-react';
import { FileViewerModal } from '@/components/common/FileViewerModal';
import { CameraCapture } from '@/components/common/camera_capture';
import { ConfirmModal } from '@startup/components/base_components/master/master_modal/ConfirmModal';
import { DocumentCardEmpty } from './DocumentCardEmpty';


const DocumentCardTile = ({ label, previewUrl, previewMime, busy, disabled, onPick, onRemove }) => {
  const uploadRef = useRef(null);
  const [open, setOpen] = useState(null); // 'viewer' | 'camera' | 'remove' | null
  const locked = busy || disabled;

  const close = () => setOpen(null);
  const openUpload = () => uploadRef.current?.click();
  const openCamera = () => setOpen('camera');
  const openViewer = () => setOpen('viewer');
  const askRemove = () => setOpen('remove');
  const confirmRemove = () => {
    close();
    onRemove();
  };
  const handlePicked = (event) => {
    const picked = event.target.files?.[0];
    event.target.value = '';
    if (picked) onPick(picked);
  };
  const handleCaptured = (file) => {
    close();
    if (file) onPick(file);
  };

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="flex items-center justify-between gap-2 border-b border-gray-100 px-3 py-2">
        <div className="flex min-w-0 items-center gap-2.5">
          <span
            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
              previewUrl ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'
            }`}
          >
            {previewUrl ? <Check className="h-4 w-4" /> : <IdCard className="h-4 w-4" />}
          </span>
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-900">{label} side</p>
            <p className="text-xs text-gray-500">{previewUrl ? 'Uploaded · click the photo to view' : 'Not uploaded'}</p>
          </div>
        </div>
        {previewUrl && (
          <button
            type="button"
            onClick={askRemove}
            disabled={locked}
            title={`Remove the ${label.toLowerCase()} photo`}
            aria-label={`Remove the ${label.toLowerCase()} photo`}
            className="rounded-md p-1.5 text-red-600 transition-colors hover:bg-red-50 hover:text-red-700 disabled:opacity-60"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="bg-gray-50 p-3">
        <div className="relative aspect-[1.586] overflow-hidden rounded-lg">
          <input ref={uploadRef} type="file" accept="image/*" className="hidden" onChange={handlePicked} />
          {previewUrl ? (
            <button
              type="button"
              onClick={openViewer}
              title={`View the ${label.toLowerCase()} side`}
              className="block h-full w-full cursor-zoom-in overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-gray-200 transition hover:shadow-md hover:ring-indigo-300"
            >
              <img src={previewUrl} alt={`${label} side`} className="h-full w-full object-cover" />
            </button>
          ) : (
            <DocumentCardEmpty disabled={locked} onUpload={openUpload} onCamera={openCamera} onDropFile={onPick} />
          )}
          {busy && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/70">
              <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
            </div>
          )}
        </div>
      </div>

      <FileViewerModal
        isOpen={open === 'viewer'}
        onClose={close}
        fileUrl={previewUrl}
        mimeType={previewMime}
        title={`${label} side`}
      />
      {open === 'camera' && <CameraCapture isOpen onCapture={handleCaptured} onClose={close} mode="photo" />}
      <ConfirmModal
        isOpen={open === 'remove'}
        onClose={close}
        onConfirm={confirmRemove}
        title={`Remove ${label.toLowerCase()} photo`}
        message={`The ${label.toLowerCase()} photo of this card will be removed.`}
        confirmText="Remove"
      />
    </div>
  );
};

DocumentCardTile.propTypes = {
  label: PropTypes.string.isRequired,
  previewUrl: PropTypes.string,
  previewMime: PropTypes.string,
  busy: PropTypes.bool,
  disabled: PropTypes.bool,
  onPick: PropTypes.func.isRequired,
  onRemove: PropTypes.func.isRequired,
};

export { DocumentCardTile };
