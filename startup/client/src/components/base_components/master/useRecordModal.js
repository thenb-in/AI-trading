import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

/**
 * Which record a master's modal is open on, if any.
 *
 * `openParam` names a URL parameter (`id`) that opens a record on arrival — a
 * link from another screen, a notification — and is dropped again when the
 * modal closes, so a refresh does not reopen it. The record is opened by id
 * alone; a master given `loadRecord` loads it, one without finds its row.
 */
const useRecordModal = ({ openParam, onClose }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const linkedId = openParam ? searchParams.get(openParam) : null;

  const open = useCallback((row) => {
    setSelectedRow(row);
    setIsOpen(true);
  }, []);

  useEffect(() => {
    if (linkedId) open({ id: linkedId });
  }, [linkedId, open]);

  // The record stays while the modal closes, so its content does not turn into
  // an empty new-record form on the way out; the next open replaces it.
  const close = useCallback(() => {
    setIsOpen(false);
    if (linkedId) {
      setSearchParams((params) => {
        params.delete(openParam);
        return params;
      }, { replace: true });
    }
    onClose?.();
  }, [linkedId, openParam, setSearchParams, onClose]);

  return { isOpen, selectedRow, setSelectedRow, open, close };
};

export { useRecordModal };
