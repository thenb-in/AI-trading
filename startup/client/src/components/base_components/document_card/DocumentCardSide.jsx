import PropTypes from 'prop-types';
import { SavedDocumentCardSide } from './SavedDocumentCardSide';
import { PendingDocumentCardSide } from './PendingDocumentCardSide';
import { documentCardSideObjectId } from './documentCard';

/** One side of a card: on the drive when the record exists, held for its save when it does not. */
const DocumentCardSide = ({ objectName, recordId, cardKey, side, disabled, pending, onPendingChange }) => {
  if (recordId) {
    return (
      <SavedDocumentCardSide
        objectName={objectName}
        objectId={documentCardSideObjectId(recordId, cardKey, side.key)}
        label={side.label}
        disabled={disabled}
      />
    );
  }
  const setFile = (file) => onPendingChange({ ...pending, [side.key]: file });
  return (
    <PendingDocumentCardSide label={side.label} file={pending?.[side.key] || null} disabled={disabled} onChange={setFile} />
  );
};

DocumentCardSide.propTypes = {
  objectName: PropTypes.string.isRequired,
  recordId: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  cardKey: PropTypes.string.isRequired,
  side: PropTypes.shape({ key: PropTypes.string.isRequired, label: PropTypes.string.isRequired }).isRequired,
  disabled: PropTypes.bool,
  pending: PropTypes.object,
  onPendingChange: PropTypes.func,
};

export { DocumentCardSide };
