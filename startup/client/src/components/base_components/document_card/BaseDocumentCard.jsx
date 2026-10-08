import PropTypes from 'prop-types';
import { IdCard } from 'lucide-react';
import { hasPermission } from '@startup/hooks/hasPermission';
import { useDataContext } from '@context/useDataContext';
import { recordPermissionName } from '@utils/recordPermission';
import { DocumentCardSide } from './DocumentCardSide';
import { DEFAULT_DOCUMENT_CARD_SIDES } from './documentCard';

/**
 * A photographed card on a record — visiting card, Aadhaar, PAN
 */
const BaseDocumentCard = ({
  objectName,
  recordId,
  cardKey,
  title,
  description,
  sides = DEFAULT_DOCUMENT_CARD_SIDES,
  pending,
  onPendingChange,
  disabled = false,
}) => {
  const { userData } = useDataContext();
  if (!hasPermission(recordPermissionName(objectName, 'attachment'), userData)) return null;

  return (
    <section className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="mb-3 flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
          <IdCard className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <h4 className="text-sm font-semibold text-gray-900">{title}</h4>
          {description && <p className="text-xs text-gray-500">{description}</p>}
        </div>
      </div>
      <div className={`grid grid-cols-1 gap-3 ${sides.length > 1 ? 'sm:grid-cols-2' : 'sm:max-w-xs'}`}>
        {sides.map((side) => (
          <DocumentCardSide
            key={side.key}
            objectName={objectName}
            recordId={recordId}
            cardKey={cardKey}
            side={side}
            disabled={disabled}
            pending={pending}
            onPendingChange={onPendingChange}
          />
        ))}
      </div>
    </section>
  );
};

BaseDocumentCard.propTypes = {
  objectName: PropTypes.string.isRequired,
  recordId: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  cardKey: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
  description: PropTypes.string,
  sides: PropTypes.arrayOf(PropTypes.shape({ key: PropTypes.string.isRequired, label: PropTypes.string.isRequired })),
  pending: PropTypes.object,
  onPendingChange: PropTypes.func,
  disabled: PropTypes.bool,
};

export { BaseDocumentCard };
