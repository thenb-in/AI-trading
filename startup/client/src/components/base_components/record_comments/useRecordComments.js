import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { recordCommentService } from '@services/recordCommentService';

/**
 * What people have said about one record, keyed by what kind of record it is
 * and which one. Its files are Drive's, keyed the same way (NBnextDriveAttachment).
 */
const useRecordComments = (objectName, objectId) => {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const canLoad = Boolean(objectName) && objectId != null && objectId !== '';

  const load = useCallback(async () => {
    if (!canLoad) {
      setComments([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const commentsResponse = await recordCommentService.getComments(objectName, objectId);
      setComments(commentsResponse?.data || []);
    } catch (error) {
      toast.error(error?.response?.data?.error || `Could not load the comments on ${objectName} ${objectId}: ${error.message}`);
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

  return { comments, loading, saving, addComment, deleteComment, reload: load };
};

export { useRecordComments };
