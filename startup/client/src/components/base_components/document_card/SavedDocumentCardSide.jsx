import PropTypes from 'prop-types';
import { DocumentCardTile } from './DocumentCardTile';
import { useSingleDriveFile } from '@startup/components/masters/nbnext_drive_master/useSingleDriveFile';

/** A side on a saved record: read from and written to the drive straight away. */
const SavedDocumentCardSide = ({ objectName, objectId, label, disabled }) => {
  const { file, previewUrl, busy, replace, remove } = useSingleDriveFile(objectName, objectId, `${label} photo`);
  return (
    <DocumentCardTile
      label={label}
      previewUrl={previewUrl}
      previewMime={file?.mimeType}
      busy={busy}
      disabled={disabled}
      onPick={replace}
      onRemove={remove}
    />
  );
};

SavedDocumentCardSide.propTypes = {
  objectName: PropTypes.string.isRequired,
  objectId: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  disabled: PropTypes.bool,
};

export { SavedDocumentCardSide };
