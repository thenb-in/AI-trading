import { useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { getApiErrorMessage } from '@utils/apiErrorMessage';

/**
 * The record a modal form edits. A master page already holds the whole row
 * and hands it as `record`, so nothing is fetched. A picker holds only an id
 * and hands `recordId`; the record is then read through `loadRecord` when the
 * modal opens, and the form waits for it (`isLoading`).
 */
const useModalRecord = ({ isOpen, record, recordId, loadRecord, label, onClose }) => {
  const [loaded, setLoaded] = useState(null);
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  });

  const needsLoad = Boolean(isOpen && !record && recordId !== null && recordId !== undefined);

  useEffect(() => {
    // Closing keeps the record: the dialog is still fading out and its form still draws it.
    // A new load clears it, so the form waits for the record it is opened on.
    if (!needsLoad) return undefined;
    setLoaded(null);
    // A modal closed or moved to another record before the read lands keeps what it has now.
    let isCurrent = true;
    loadRecord(recordId)
      .then((found) => {
        if (!found) throw new Error(`${label} ${recordId} was not found`);
        if (isCurrent) setLoaded(found);
      })
      .catch((loadError) => {
        if (!isCurrent) return;
        toast.error(getApiErrorMessage(loadError, `Could not load ${label} ${recordId}`));
        closeRef.current();
      });
    return () => {
      isCurrent = false;
    };
  }, [needsLoad, recordId, loadRecord, label]);

  return { record: record ?? loaded, isLoading: needsLoad && !loaded };
};

export { useModalRecord };
