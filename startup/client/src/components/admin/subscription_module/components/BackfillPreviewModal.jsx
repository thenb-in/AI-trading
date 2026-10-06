import PropTypes from 'prop-types';
import { Sparkles } from 'lucide-react';
import { BaseModal, MasterModalActions } from '@startup/components/base_components/master';

/**
 * Shows exactly what "Generate missing" will add before it writes anything:
 * every plan, the subscribed masters it will top up, and the individual
 * permissions under each. The Generate button carries the total so the count
 * is never out of sight.
 */
function BackfillPreviewModal({ plan, onClose, onApply, isApplying }) {
  const subscriptions = plan?.subscriptions || [];
  const total = plan?.total || 0;

  return (
    <BaseModal
      isOpen={!!plan}
      onClose={onClose}
      maxWidth="lg"
      title={(
        <span className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-blue-600" />
          Generate missing permissions
        </span>
      )}
      actions={(
        <MasterModalActions
          onCancel={onClose}
          onConfirm={onApply}
          confirmLabel={`Generate ${total} permission${total === 1 ? '' : 's'}`}
          busyLabel="Generating…"
          isBusy={isApplying}
        />
      )}
    >
      <div className="space-y-3">
        <p className="text-xs text-gray-600">
          Each permission below belongs to a master already subscribed on that plan but has no row
          yet — a newly added operation (such as comment or attachment). They will be added as
          <span className="font-medium"> subscribed</span>. Nothing you have already set is changed.
        </p>

        {subscriptions.map((subscription) => (
          <div key={subscription.id} className="border border-gray-200 rounded">
            <div className="flex items-center justify-between bg-gray-50 px-3 py-2 border-b border-gray-200">
              <span className="text-sm font-semibold text-gray-900">{subscription.name}</span>
              <span className="text-xs text-gray-600">
                {subscription.added} permission{subscription.added === 1 ? '' : 's'} · {subscription.masters.length} master{subscription.masters.length === 1 ? '' : 's'}
              </span>
            </div>
            <div className="p-2 space-y-1.5 max-h-64 overflow-y-auto">
              {subscription.masters.map((entry) => (
                <div key={entry.master} className="text-xs leading-relaxed">
                  <span className="font-medium text-gray-800">{entry.master}</span>
                  <span className="text-gray-400"> — </span>
                  <span className="text-gray-600">{entry.permissions.join(', ')}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </BaseModal>
  );
}

BackfillPreviewModal.propTypes = {
  // null when closed; otherwise { total, subscriptions: [{ id, name, added, masters: [{ master, permissions }] }] }
  plan: PropTypes.object,
  onClose: PropTypes.func.isRequired,
  onApply: PropTypes.func.isRequired,
  isApplying: PropTypes.bool,
};

export { BackfillPreviewModal };
