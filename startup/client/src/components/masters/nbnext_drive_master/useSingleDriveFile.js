import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { nbnextDriveService } from '@services/nbnextDriveService';
import { getApiErrorMessage } from '@utils/apiErrorMessage';
import { loadDriveImageUrl } from './driveImageUrl';
import { useExistingAttachments } from './useExistingAttachments';

// One file kept on a record in NBnext Drive
const useSingleDriveFile = (objectName, objectId, fileLabel) => {
  const { existingFiles, loadingFiles, refetch } = useExistingAttachments(objectName, objectId);
  const [previewUrl, setPreviewUrl] = useState('');
  const [saving, setSaving] = useState(false);
  // Newest first from the drive.
  const file = existingFiles[0] || null;

  useEffect(() => {
    setPreviewUrl('');
    if (!file) return undefined;
    let cancelled = false;
    loadDriveImageUrl(file.id)
      .then((url) => { if (!cancelled) setPreviewUrl(url); })
      .catch((error) => toast.error(getApiErrorMessage(error, `Could not show the ${fileLabel}`)));
    return () => { cancelled = true; };
  }, [file, fileLabel]);

  const run = useCallback(async (work, doneMessage, failMessage) => {
    setSaving(true);
    try {
      await work();
      toast.success(doneMessage);
      await refetch();
    } catch (error) {
      toast.error(getApiErrorMessage(error, failMessage));
    } finally {
      setSaving(false);
    }
  }, [refetch]);

  const deleteAll = useCallback(
    () => Promise.all(existingFiles.map((f) => nbnextDriveService.deleteFile(Number(f.id)))),
    [existingFiles]
  );

  const replace = useCallback((picked) => run(async () => {
    await nbnextDriveService.uploadFile(picked, objectName, objectId);
    await deleteAll();
  }, `${fileLabel} saved`, `Could not save the ${fileLabel}`), [run, objectName, objectId, deleteAll, fileLabel]);

  const remove = useCallback(
    () => run(deleteAll, `${fileLabel} removed`, `Could not remove the ${fileLabel}`),
    [run, deleteAll, fileLabel]
  );

  return { file, previewUrl, busy: loadingFiles || saving, replace, remove };
};

export { useSingleDriveFile };
