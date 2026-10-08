import PropTypes from 'prop-types';
import { useObjectUrl } from '@startup/hooks/useObjectUrl';
import { DocumentCardTile } from './DocumentCardTile';

/** A side picked before the record has an id: the caller holds the file until its save. */
const PendingDocumentCardSide = ({ label, file, disabled, onChange }) => {
  const previewUrl = useObjectUrl(file);
  const clear = () => onChange(null);
  return (
    <DocumentCardTile
      label={label}
      previewUrl={previewUrl}
      previewMime={file?.type}
      disabled={disabled}
      onPick={onChange}
      onRemove={clear}
    />
  );
};

PendingDocumentCardSide.propTypes = {
  label: PropTypes.string.isRequired,
  file: PropTypes.object,
  disabled: PropTypes.bool,
  onChange: PropTypes.func.isRequired,
};

export { PendingDocumentCardSide };
