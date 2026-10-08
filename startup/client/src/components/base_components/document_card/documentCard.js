import { nbnextDriveService } from '@services/nbnextDriveService';

const DEFAULT_DOCUMENT_CARD_SIDES = [
  { key: 'front', label: 'Front' },
  { key: 'back', label: 'Back' },
];

// Every side of every card is its own drive object, so cards and sides never mix:
// 12_visiting_card_front, 12_aadhaar_back, 12_pan_front.
const documentCardSideObjectId = (recordId, cardKey, side) => `${recordId}_${cardKey}_${side}`;

/**
 * Uploads the sides picked while the record had no id, once its save hands the id back.
 * `pending` is `{ [side]: File | null }`.
 */
const uploadPendingDocumentCard = async (objectName, recordId, cardKey, pending) => {
  for (const [side, file] of Object.entries(pending)) {
    if (file) await nbnextDriveService.uploadFile(file, objectName, documentCardSideObjectId(recordId, cardKey, side));
  }
};

export { DEFAULT_DOCUMENT_CARD_SIDES, documentCardSideObjectId, uploadPendingDocumentCard };
