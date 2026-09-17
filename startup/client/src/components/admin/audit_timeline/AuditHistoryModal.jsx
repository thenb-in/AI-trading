import PropTypes from 'prop-types';
import { BaseModal } from '@startup/components/base_components/master/master_modal/BaseModal';
import { AuditTimeline } from './AuditTimeline';

/**
 * A record's history, over the record's own modal.
 *
 * BaseModal opens this one (its "Show Audit History" button), and this one is a
 * BaseModal in turn — the two import each other, which is safe because each
 * only names the other while rendering, never while loading.
 */
const AuditHistoryModal = ({
  isOpen,
  onClose,
  head,
  objectId,
  pageSize = 25,
  maxWidth = 'md'
}) => (
  <BaseModal
    isOpen={isOpen}
    onClose={onClose}
    title="Audit History"
    maxWidth={maxWidth}
    showAudit={false}
    autoFocusFirstField={false}
    zIndex={60}
  >
    <AuditTimeline head={head} objectId={objectId} pageSize={pageSize} />
  </BaseModal>
);

AuditHistoryModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  head: PropTypes.string,
  objectId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  pageSize: PropTypes.number,
  maxWidth: PropTypes.oneOf(['xs', 'sm', 'md', 'lg', 'xl']),
};

export { AuditHistoryModal };
