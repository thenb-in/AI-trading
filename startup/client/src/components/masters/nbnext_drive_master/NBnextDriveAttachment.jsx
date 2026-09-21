import { useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import { Download, X, FileText, Image, Eye } from 'lucide-react';
import { toast } from 'react-toastify';
import { nbnextDriveService } from '@/services/nbnextDriveService';
import { FileViewerModal } from '@/components/common/FileViewerModal';
import { FilesSection } from './FilesSection';
import { useExistingAttachments } from './useExistingAttachments';
import { getApiErrorMessage } from '@utils/apiErrorMessage';

/** Same normalize as NBnextDriveForm: FilesSection can pass array or single File or null. */
function toFiles(v) {
  if (v == null) return [];
  return Array.isArray(v) ? v.filter(Boolean) : v instanceof File ? [v] : [];
}

/**
 * Attachment uses FilesSection the same way NBnextDriveForm does (files in box, view/remove inside).
 * Only extra: existing files from API listed above, with view/download/delete and a modal for server URLs.
 */
const NBnextDriveAttachment = ({
  objectName,
  objectId,
  accept = '*/*',
  hint = 'Any file type supported (max 100MB)',
  showCamera = true,
  disabled = false,
  multipleSelect = false,
  uploadOnSubmitOnly = false,
  pendingFiles = [],
  onPendingFilesChange,
  title = 'Attachments',
  startDate,
  endDate,
  attachmentsState
}) => {
  const internal = useExistingAttachments(
    objectName,
    objectId,
    startDate,
    endDate,
    !attachmentsState
  );
  const { existingFiles, loadingFiles, refetch } = attachmentsState ?? internal;
  const [uploading, setUploading] = useState(false);
  const [localFiles, setLocalFiles] = useState([]);
  const [viewerState, setViewerState] = useState({ open: false, url: '', mime: '', title: '', isBlob: false, fileId: null });

  const hasObjectId = objectId != null && objectId !== '';

  // Same pattern as Form: one handler, normalize then update the right source
  const handleFileChange = useCallback(
    (filesOrNull) => {
      const next = toFiles(filesOrNull);
      if (uploadOnSubmitOnly || !hasObjectId) {
        onPendingFilesChange?.(next);
        return;
      }
      if (next.length) {
        setLocalFiles(next);
        setUploading(true);
        (async () => {
          try {
            for (const file of next) {
              await nbnextDriveService.uploadFile(file, objectName, String(objectId), endDate || null);
            }
            toast.success(next.length === 1 ? 'File uploaded.' : `${next.length} files uploaded.`);
            refetch();
          } catch (err) {
            console.error('Upload error:', err);
            toast.error(getApiErrorMessage(err, 'Failed to upload file(s)'));
          } finally {
            setUploading(false);
            setLocalFiles([]);
          }
        })();
      } else {
        setLocalFiles([]);
      }
    },
    [uploadOnSubmitOnly, hasObjectId, objectName, objectId, endDate, onPendingFilesChange, refetch]
  );

  const handleViewerLoadError = useCallback((msg) => {
    toast.error(msg);
  }, []);

  const closeViewer = useCallback(() => {
    setViewerState((prev) => {
      if (prev.isBlob && prev.url) try { URL.revokeObjectURL(prev.url); } catch { /* ignore */ }
      return { open: false, url: '', mime: '', title: '', isBlob: false, fileId: null };
    });
  }, []);

  // fileId is set only for files that already live on the server; a pending
  // blob has nothing to download from the API, so the viewer offers no button.
  const openView = useCallback((url, mime, title, isBlob, fileId = null) => {
    setViewerState({ open: true, url, mime: mime || '', title: title || 'File', isBlob, fileId });
  }, []);

  const onExistingView = useCallback(
    (e) => {
      const id = e.currentTarget.dataset.fileId;
      const f = existingFiles.find((x) => String(x.id) === String(id));
      if (f) openView(`/nbnext-drive/${f.id}/download`, f.mimeType, f.fileName, false, f.id);
    },
    [existingFiles, openView]
  );

  const downloadExistingFile = useCallback(
    async (id) => {
      const f = existingFiles.find((x) => String(x.id) === String(id));
      if (!f) return;
      try {
        const res = await nbnextDriveService.downloadFile(f.id);
        const blob = res?.data ?? res;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = f.fileName || 'attachment';
        a.click();
        URL.revokeObjectURL(url);
      } catch (err) {
        toast.error(getApiErrorMessage(err, 'Failed to download file'));
      }
    },
    [existingFiles]
  );

  const onExistingDownload = useCallback(
    (e) => downloadExistingFile(e.currentTarget.dataset.fileId),
    [downloadExistingFile]
  );

  const onExistingDelete = useCallback(
    async (e) => {
      const id = e.currentTarget.dataset.fileId;
      if (!window.confirm('Remove this attachment?')) return;
      try {
        await nbnextDriveService.deleteFile(Number(id));
        toast.success('Attachment removed.');
        refetch();
      } catch (err) {
        toast.error(getApiErrorMessage(err, 'Failed to remove attachment'));
      }
    },
    [refetch]
  );

  const displayFiles = uploadOnSubmitOnly || !hasObjectId ? (pendingFiles || []) : localFiles;
  const hasExisting = existingFiles.length > 0;
  const showEmpty = !hasExisting && !displayFiles.length && !loadingFiles;

  return (
    <div className="space-y-3 rounded-lg border border-gray-200 bg-gray-50/50 p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-800">{title}</h3>
        {hint && <span className="text-xs text-gray-500">{hint}</span>}
      </div>

      {loadingFiles && <p className="text-sm text-gray-500">Loading attachments...</p>}

      {hasExisting && (
        <ul className="space-y-2">
          {existingFiles.map((f) => (
            <li key={f.id} className="flex items-center justify-between rounded border border-gray-200 bg-white px-3 py-2 text-sm">
              <div className="flex min-w-0 items-center gap-2">
                {f.mimeType?.startsWith('image/') ? <Image className="h-4 w-4 shrink-0 text-gray-500" /> : <FileText className="h-4 w-4 shrink-0 text-gray-500" />}
                <span className="truncate">{f.fileName}</span>
                {f.fileSize && <span className="text-gray-400">({f.fileSize})</span>}
              </div>
              <div className="flex shrink-0 gap-1">
                <button type="button" data-file-id={f.id} onClick={onExistingView} className="rounded p-1 text-gray-600 hover:bg-gray-100" title="View"><Eye className="h-4 w-4" /></button>
                <button type="button" data-file-id={f.id} onClick={onExistingDownload} className="rounded p-1 text-gray-600 hover:bg-gray-100" title="Download"><Download className="h-4 w-4" /></button>
                {!disabled && (
                  <button type="button" data-file-id={f.id} onClick={onExistingDelete} className="rounded p-1 text-red-600 hover:bg-red-50" title="Remove"><X className="h-4 w-4" /></button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {!hasObjectId && onPendingFilesChange && (
        <p className="text-xs text-gray-500">Save the record first to upload here, or add files below to attach after save.</p>
      )}

      {!disabled && (
        <FilesSection
          selectedFile={multipleSelect ? undefined : (displayFiles[0] ?? null)}
          selectedFiles={multipleSelect ? displayFiles : undefined}
          onFileChange={handleFileChange}
          accept={accept}
          hint={hint}
          showCamera={showCamera}
          disabled={uploading}
          multiple={multipleSelect}
        />
      )}

      {showEmpty && <p className="text-sm text-gray-500">No attachments yet.</p>}

      <FileViewerModal
        isOpen={viewerState.open}
        onClose={closeViewer}
        fileUrl={viewerState.url}
        mimeType={viewerState.mime}
        title={viewerState.title}
        onLoadError={handleViewerLoadError}
        onDownload={viewerState.fileId ? () => downloadExistingFile(viewerState.fileId) : null}
      />
    </div>
  );
};

NBnextDriveAttachment.propTypes = {
  objectName: PropTypes.string.isRequired,
  objectId: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  accept: PropTypes.string,
  hint: PropTypes.string,
  showCamera: PropTypes.bool,
  disabled: PropTypes.bool,
  multipleSelect: PropTypes.bool,
  uploadOnSubmitOnly: PropTypes.bool,
  pendingFiles: PropTypes.arrayOf(PropTypes.instanceOf(File)),
  onPendingFilesChange: PropTypes.func,
  title: PropTypes.node,
  startDate: PropTypes.string,
  endDate: PropTypes.string,
  attachmentsState: PropTypes.shape({
    existingFiles: PropTypes.array.isRequired,
    loadingFiles: PropTypes.bool.isRequired,
    refetch: PropTypes.func.isRequired
  })
};

export { NBnextDriveAttachment };
