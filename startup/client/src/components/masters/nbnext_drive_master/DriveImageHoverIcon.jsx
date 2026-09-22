import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import PropTypes from 'prop-types';
import { Image } from 'lucide-react';
import { useDataContext } from '@context/useDataContext';
import { hasPermission } from '@startup/hooks/hasPermission';
import { nbnextDriveService } from '@startup/services/nbnextDriveService';

const PREVIEW_IMAGE_SIZE = 200;
const PREVIEW_MAX_WIDTH = 640;
const PREVIEW_GAP = 6;

// One blob URL per Drive file for the whole session: hovering the same image
// again, in this dropdown or any other, shows it at once.
const imageUrlByFileId = new Map();

const loadImageUrl = (fileId) => {
  if (!imageUrlByFileId.has(fileId)) {
    const request = nbnextDriveService.downloadFile(fileId)
      .then((res) => URL.createObjectURL(res?.data ?? res))
      .catch((err) => {
        // A failed fetch is retried on the next hover, not cached.
        imageUrlByFileId.delete(fileId);
        throw err;
      });
    imageUrlByFileId.set(fileId, request);
  }
  return imageUrlByFileId.get(fileId);
};

// The card sits just above what it belongs to — the open menu, else the icon
// itself on the picked field — or beside it when there is no room above.
const previewPosition = (anchorRect) => {
  const roomAbove = anchorRect.top - PREVIEW_GAP * 2;
  if (roomAbove >= PREVIEW_IMAGE_SIZE / 2) {
    return {
      left: anchorRect.left,
      bottom: window.innerHeight - anchorRect.top + PREVIEW_GAP,
      maxHeight: roomAbove
    };
  }
  return { left: anchorRect.right + PREVIEW_GAP, top: anchorRect.top, maxHeight: window.innerHeight - anchorRect.top - PREVIEW_GAP };
};

// A click on the icon only views; it neither picks the row nor opens the field.
const stopClick = (e) => e.stopPropagation();

/**
 * A small image icon for a record with images in Drive; hovering it shows them
 * all. Nothing is drawn without images, or for a user who may not read other
 * people's Drive files (the download would be refused).
 */
function DriveImageHoverIcon({ fileIds, title }) {
  const { userData } = useDataContext();
  const [position, setPosition] = useState(null);
  const [urls, setUrls] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!position || urls) return undefined;
    let active = true;
    Promise.all(fileIds.map(loadImageUrl))
      .then((loaded) => active && setUrls(loaded))
      .catch((err) => active && setError(`Could not load images of ${title}: ${err?.error || err?.message || 'unknown error'}`));
    return () => { active = false; };
  }, [position, urls, fileIds, title]);

  if (!fileIds?.length || !hasPermission('read_nbnext_drive', userData)) return null;

  const show = (e) => {
    const anchor = e.currentTarget.closest('[role="listbox"]')?.parentElement ?? e.currentTarget;
    setError('');
    setPosition(previewPosition(anchor.getBoundingClientRect()));
  };
  // Forget the shown images: the next hover picks up files added since, and
  // their downloads are cached anyway.
  const hide = () => {
    setPosition(null);
    setUrls(null);
  };

  return (
    <>
      <span
        onMouseEnter={show}
        onMouseLeave={hide}
        onClick={stopClick}
        aria-label={`Show ${fileIds.length} image(s) of ${title}`}
        className="shrink-0 inline-flex items-center gap-0.5 p-0.5 rounded text-gray-400 hover:text-blue-600 hover:bg-blue-100"
      >
        <Image size={14} />
        {fileIds.length > 1 ? <span className="text-[10px] leading-none">{fileIds.length}</span> : null}
      </span>
      {position && createPortal(
        <div
          style={{ position: 'fixed', zIndex: 10000, maxWidth: PREVIEW_MAX_WIDTH, ...position }}
          className="pointer-events-none overflow-hidden flex flex-wrap items-center gap-1 bg-white border border-gray-300 rounded shadow-lg p-1 min-w-[80px] min-h-[60px]"
        >
          {urls ? urls.map((url, index) => (
            <img
              key={fileIds[index]}
              src={url}
              alt={`${title} (${index + 1} of ${urls.length})`}
              style={{ maxHeight: PREVIEW_IMAGE_SIZE, maxWidth: PREVIEW_IMAGE_SIZE }}
              className="object-contain"
            />
          )) : (
            <span className="px-2 text-xs text-gray-500">{error || 'Loading images…'}</span>
          )}
        </div>,
        document.body
      )}
    </>
  );
}

DriveImageHoverIcon.propTypes = {
  /** Drive file ids of the images, in the order shown; nothing is drawn without any. */
  fileIds: PropTypes.arrayOf(PropTypes.number),
  /** What the images are of — alt text and error messages. */
  title: PropTypes.string.isRequired
};

export { DriveImageHoverIcon };
