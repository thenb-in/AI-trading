import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { nbnextDriveService } from '@/services/startup/nbnextDriveService';

/**
 * Fetches and refetches existing attachments for an object.
 * @returns {{ existingFiles: array, loadingFiles: boolean, refetch: function }}
 */
function useExistingAttachments(objectName, objectId) {
  const [existingFiles, setExistingFiles] = useState([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const hasObjectId = objectId != null && objectId !== '';

  const refetch = useCallback(async () => {
    if (!objectName || !hasObjectId) {
      setExistingFiles([]);
      return;
    }
    setLoadingFiles(true);
    try {
      const result = await nbnextDriveService.getFilesByObject(objectName, String(objectId));
      setExistingFiles(Array.isArray(result?.data) ? result.data : []);
    } catch (err) {
      console.error('Error fetching attachments:', err);
      toast.error(err?.error || 'Failed to load attachments');
      setExistingFiles([]);
    } finally {
      setLoadingFiles(false);
    }
  }, [objectName, objectId, hasObjectId]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { existingFiles, loadingFiles, refetch };
}

export { useExistingAttachments };
