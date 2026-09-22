import { createContext, useCallback, useContext, useLayoutEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { nbnextDriveService } from '@services/nbnextDriveService';
import { plural } from '@utils/formattingUtils';

/**
 * The files of the record a form modal is open on. They are NBnext Drive files
 * filed under the master's name and the record's id, so every screen that shows
 * them — the modal's own panel, a form that draws them its own way, Drive
 * itself — reads the same list.
 *
 * A record still being created has no id to file against, so what is picked
 * for it waits here, and the modal uploads it the moment the save hands back
 * the record.
 */
const RecordAttachmentsContext = createContext(null);

/**
 * Held by FormModal: the files waiting on the save, and whether the form draws
 * the list itself. `attachBeforeSave` is the form's say-so that a record it is
 * creating takes files too — a record's form, whose submit hands the saved
 * record back; a merge or a bulk edit makes no record to file them under.
 */
const useRecordAttachmentsState = (objectName, objectId, attachBeforeSave) => {
  const [pendingFiles, setPendingFiles] = useState([]);
  const [isDrawnByForm, setIsDrawnByForm] = useState(false);

  const uploadPending = useCallback(async (savedId) => {
    if (!pendingFiles.length) return;
    try {
      for (const file of pendingFiles) {
        await nbnextDriveService.uploadFile(file, objectName, String(savedId));
      }
      setPendingFiles([]);
      toast.success(`${plural(pendingFiles.length, 'file')} attached to ${objectName} ${savedId}`);
    } catch (error) {
      // The record is saved by now; only its files are missing, so say which.
      toast.error(`${objectName} ${savedId} was saved, but its files did not all upload: ${error?.error || error.message}`);
    }
  }, [objectName, pendingFiles]);

  return useMemo(
    () => ({ objectName, objectId, attachBeforeSave, pendingFiles, setPendingFiles, uploadPending, isDrawnByForm, setIsDrawnByForm }),
    [objectName, objectId, attachBeforeSave, pendingFiles, uploadPending, isDrawnByForm]
  );
};

/**
 * For a form inside a FormModal that works with its record's files itself:
 * `{ objectName, objectId, pendingFiles, setPendingFiles, uploadPending }`,
 * the same ones the modal files and uploads. Files picked into `pendingFiles`
 * go up with the save; `uploadPending(id)` sends them for a save the modal does
 * not run (a Duplicate button's own create).
 *
 * `drawsList: true` says the form shows the files itself, so the modal's panel
 * leaves its list out rather than showing them twice.
 */
const useModalAttachments = ({ drawsList = false } = {}) => {
  const attachments = useContext(RecordAttachmentsContext);
  // A form is not always opened on a record of its own: the same document form
  // is also opened from a work order, an indent and a report, where there is no
  // record for files to belong to. It simply has none there.
  const setIsDrawnByForm = attachments?.setIsDrawnByForm;
  useLayoutEffect(() => {
    if (!drawsList || !setIsDrawnByForm) return undefined;
    setIsDrawnByForm(true);
    return () => setIsDrawnByForm(false);
  }, [drawsList, setIsDrawnByForm]);
  return attachments;
};

export { RecordAttachmentsContext, useRecordAttachmentsState, useModalAttachments };
