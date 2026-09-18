import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { recordCommentService } from '@services/recordCommentService';
import { nbnextDriveService } from '@services/nbnextDriveService';

/**
 * Everything said and attached about one record: its comments, and the Drive
 * files filed against it. Both are keyed the same way — what kind of record it
 * is, and which one — so they load and refresh together.
 */
const useRecordComments = (objectName, objectId) => {
  const [comments, setComments] = useState([]);
  const [attachments, setAttachments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const canLoad = Boolean(objectName) && objectId != null && objectId !== '';

  const load = useCallback(async () => {
    if (!canLoad) {
      setComments([]);
      setAttachments([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [commentsResponse, filesResponse] = await Promise.all([
        recordCommentService.getComments(objectName, objectId),
        nbnextDriveService.getFilesByObject(objectName, objectId)
      ]);
      setComments(commentsResponse?.data || []);
      setAttachments(filesResponse?.data || []);
    } catch (error) {
      toast.error(error?.response?.data?.error || `Could not load the notes on this ${objectName}: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }, [canLoad, objectName, objectId]);

  useEffect(() => {
    load();
  }, [load]);

  const addComment = useCallback(async (body) => {
    setSaving(true);
    try {
      await recordCommentService.addComment(objectName, objectId, body);
      await load();
      return true;
    } catch (error) {
      toast.error(error?.response?.data?.error || `Could not post the comment: ${error.message}`);
      return false;
    } finally {
      setSaving(false);
    }
  }, [objectName, objectId, load]);

  const deleteComment = useCallback(async (id) => {
    try {
      await recordCommentService.deleteComment(id);
      await load();
    } catch (error) {
      toast.error(error?.response?.data?.error || `Could not delete the comment: ${error.message}`);
    }
  }, [load]);

  const attachFile = useCallback(async (file) => {
    setSaving(true);
    try {
      await nbnextDriveService.uploadFile(file, objectName, String(objectId));
      toast.success(`Attached ${file.name}`);
      await load();
    } catch (error) {
      toast.error(error?.response?.data?.error || `Could not attach ${file.name}: ${error.message}`);
    } finally {
      setSaving(false);
    }
  }, [objectName, objectId, load]);

  const removeAttachment = useCallback(async (file) => {
    try {
      await nbnextDriveService.deleteFile(file.id);
      toast.success(`Removed ${file.fileName}`);
      await load();
    } catch (error) {
      toast.error(error?.response?.data?.error || `Could not remove ${file.fileName}: ${error.message}`);
    }
  }, [load]);

  return { comments, attachments, loading, saving, addComment, deleteComment, attachFile, removeAttachment, reload: load };
};

export { useRecordComments };
