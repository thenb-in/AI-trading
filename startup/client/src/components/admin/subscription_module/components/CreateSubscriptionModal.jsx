import { CheckboxTypeField } from '@startup/components/base_components/fields/CheckboxTypeField';
import { TextTypeField } from '@startup/components/base_components/fields/TextTypeField';
import { TextareaTypeField } from '@startup/components/base_components/fields/TextareaTypeField';
import { useCallback, useEffect, useId } from 'react';
import PropTypes from 'prop-types';
import { Globe } from 'lucide-react';
import { BaseModal, MasterModalActions } from '@startup/components/base_components/master';
import { useRecordCreateForm } from '@/hooks/useRecordCreateForm';
import { ApiService } from '@services/ApiService';
import { useDataContext } from '@context/useDataContext';
import { useSubscriptionPermissionDraft } from '../hooks/useSubscriptionPermissionDraft';
import { SubscriptionPermissionEditor } from './SubscriptionPermissionEditor';

function CreateSubscriptionModal({ isOpen, onClose, onSuccess, permissions = [], initialName = '' }) {
  const { userData } = useDataContext();
  const canCreateGlobal = !!userData?.isSupportUser;

  const {
    name,
    description,
    isGlobal,
    submitting,
    errors,
    setIsGlobal,
    handleNameChange,
    handleDescriptionChange,
    reset: resetFields,
    resetWith,
    submit,
  } = useRecordCreateForm('Subscription', { initialName });
  // The footer sits outside the form element and reaches it by id.
  const formId = useId();

  const draft = useSubscriptionPermissionDraft(permissions);

  // Seed on the open transition only — see CreateRecordModal for why.
  useEffect(() => {
    if (isOpen) resetWith();
    // resetWith is stable and reads the latest seed from a ref.
  }, [isOpen]);

  const resetForm = useCallback(() => {
    resetFields();
    draft.reset([]);
  }, [resetFields, draft]);

  const handleClose = useCallback(() => {
    if (!submitting) {
      resetForm();
      onClose();
    }
  }, [submitting, resetForm, onClose]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const ok = await submit(() =>
      ApiService.createSubscription({
        name: name.trim(),
        description: description.trim() || null,
        ...(canCreateGlobal && { isGlobal }),
        permissions: draft.changedRows, // base is empty → only the non-default picks
      }),
    );
    if (ok) {
      resetForm();
      onClose();
      if (onSuccess) {
        onSuccess();
      }
    }
  };

  const actions = (
    <MasterModalActions
      onCancel={handleClose}
      formId={formId}
      confirmLabel="Create Subscription"
      isBusy={submitting}
      busyLabel="Creating..."
    />
  );

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={handleClose}
      title="Create New Subscription"
      maxWidth="lg"
      showAudit={false}
      actionsLeft={<span className="text-xs text-gray-600">{`${draft.changedRows.length} selected`}</span>}
      actions={actions}
    >
      <form id={formId} onSubmit={handleSubmit} className="space-y-4">
        {/* Name */}
        <div>
          <TextTypeField
            label="Subscription Name"
            required
            value={name}
            onChange={handleNameChange}
            disabled={submitting}
            error={errors.name || ''}
            placeholder="Enter subscription name"
          />
        </div>

        {/* Description */}
        <div>
          <TextareaTypeField
            label="Description"
            value={description}
            onChange={handleDescriptionChange}
            disabled={submitting}
            rows={2}
            error={errors.description || ''}
            placeholder="Enter subscription description (optional)"
          />
        </div>

        {/* Global toggle - only for super users */}
        {canCreateGlobal && (
          <div className="flex items-start gap-2 p-2 bg-purple-50 border border-purple-200 rounded">
            <CheckboxTypeField
              mode="bare"
              id="subscription-isGlobal"
              checked={isGlobal}
              onChange={(e) => setIsGlobal(e.target.checked)}
              disabled={submitting}
              className="mt-0.5"
            />
            <label htmlFor="subscription-isGlobal" className="text-xs text-purple-900 select-none">
              <span className="inline-flex items-center gap-1 font-medium">
                <Globe className="w-3 h-3" />
                Create as global subscription
              </span>
              <p className="text-purple-700 mt-0.5">
                Available to every company instead of just yours.
              </p>
            </label>
          </div>
        )}

        {/* Permissions */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Permissions</label>
          <p className="text-xs text-gray-500 mb-2">
            Set permission status now. Anything left unset stays <strong>Not Subscribed</strong>.
          </p>
          <SubscriptionPermissionEditor
            permissions={permissions}
            getStatus={draft.getStatus}
            onUpdatePermissionStatus={draft.setStatus}
            onUpdateMultiplePermissionStatuses={draft.setMany}
            updating={submitting}
            namePrefix="create-"
          />
        </div>
      </form>
    </BaseModal>
  );
}

CreateSubscriptionModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSuccess: PropTypes.func,
  permissions: PropTypes.array,
  /** Pre-fills the subscription name. */
  initialName: PropTypes.string,
};

export { CreateSubscriptionModal };
