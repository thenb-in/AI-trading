import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { nbnextDriveService } from '@/services/nbnextDriveService';

/**
 * Fetches and refetches existing attachments for an object.
 * Optional startDate/endDate (YYYY-MM-DD) filter by createdAt range.
 * Pass enabled=false to opt out of the API call (useful when a parent already
 * fetched the same list and wants to share it via props).
 * @returns {{ existingFiles: array, loadingFiles: boolean, refetch: function }}
 */
function useExistingAttachments(objectName, objectId, startDate, endDate, enabled = true) {
  const [existingFiles, setExistingFiles] = useState([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const hasObjectId = objectId != null && objectId !== '';

  const refetch = useCallback(async () => {
    if (!enabled || !objectName || !hasObjectId) {
      setExistingFiles([]);
      return;
    }
    setLoadingFiles(true);
    try {
      const result = await nbnextDriveService.getFilesByObject(
        objectName,
        String(objectId),
        startDate || undefined,
        endDate || undefined
      );
      setExistingFiles(Array.isArray(result?.data) ? result.data : []);
    } catch (err) {
      console.error('Error fetching attachments:', err);
      toast.error(err?.error || 'Failed to load attachments');
      setExistingFiles([]);
    } finally {
      setLoadingFiles(false);
    }
  }, [enabled, objectName, objectId, hasObjectId, startDate, endDate]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { existingFiles, loadingFiles, refetch };
}

export { useExistingAttachments };
