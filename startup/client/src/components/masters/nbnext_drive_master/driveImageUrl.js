import { nbnextDriveService } from '@startup/services/nbnextDriveService';

// One blob URL per Drive file for the whole session: showing the same image
// again, anywhere, is instant.
const imageUrlByFileId = new Map();

/** A browser URL for a Drive image, fetched once and shared. A failed fetch is retried next time, not cached. */
const loadDriveImageUrl = (fileId) => {
  if (!imageUrlByFileId.has(fileId)) {
    const request = nbnextDriveService.downloadFile(fileId)
      .then((res) => URL.createObjectURL(res?.data ?? res))
      .catch((err) => {
        imageUrlByFileId.delete(fileId);
        throw err;
      });
    imageUrlByFileId.set(fileId, request);
  }
  return imageUrlByFileId.get(fileId);
};

export { loadDriveImageUrl };
