import PropTypes from 'prop-types';
import { Power } from 'lucide-react';
import { FormFooter } from '@startup/components/base_components/master';
import { useNotificationRuleForm } from './useNotificationRuleForm';
import { RuleNameSection } from './form/RuleNameSection';
import { RecipientSection } from './form/RecipientSection';
import { ChannelSection } from './form/channel/ChannelSection';


const NotificationRuleMasterForm = ({ isOpen, onClose, initialData, onSaved }) => {
  const form = useNotificationRuleForm({ isOpen, initialData, onSaved, onClose });

  if (!isOpen) {
    return null;
  }

  return (
    <form onSubmit={form.submit} className="space-y-4">
      <div className="flex justify-end">
        <button
          type="button"
          role="switch"
          aria-checked={Boolean(form.rule.is_active)}
          onClick={() => form.patchRule({ is_active: !form.rule.is_active })}
          className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
            form.rule.is_active
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
              : 'border-gray-300 bg-gray-50 text-gray-500'
          }`}
        >
          <Power className="h-3.5 w-3.5" />
          {form.rule.is_active ? 'Active' : 'Paused'}
        </button>
      </div>

      <div className="divide-y-2 divide-gray-200">
        <RuleNameSection
          rule={form.rule}
          permissions={form.permissions}
          selectedPermission={form.selectedPermission}
          isLoading={form.isLoadingOptions}
          onChange={form.patchRule}
        />

        <RecipientSection
          rule={form.rule}
          audience={form.audience}
          onPatch={form.patchRule}
          recipientCount={form.recipientCount}
          totalRecipients={form.totalRecipients}
          isLoading={form.isLoadingOptions}
          onChange={form.setRecipient}
        />

        <ChannelSection rule={form.rule} onChange={form.setChannel} />
      </div>

      <FormFooter
        onClose={onClose}
        isLoading={form.isSaving}
        isEditMode={form.isEditMode}
        createLabel="Create Rule"
        updateLabel="Update Rule"
        creatingLabel="Saving..."
        iconVariant="checkmark"
        />
    </form>
  );
};

NotificationRuleMasterForm.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  initialData: PropTypes.object,
  onSaved: PropTypes.func
};

export { NotificationRuleMasterForm };
