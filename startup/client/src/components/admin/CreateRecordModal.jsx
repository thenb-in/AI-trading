import { CheckboxTypeField } from '@startup/components/base_components/fields/CheckboxTypeField';
import { TextTypeField } from '@startup/components/base_components/fields/TextTypeField';
import { TextareaTypeField } from '@startup/components/base_components/fields/TextareaTypeField';
import { useCallback, useEffect, useId } from 'react';
import PropTypes from 'prop-types';
import { Globe } from 'lucide-react';
import { BaseModal, MasterModalActions } from '@startup/components/base_components/master';
import { useRecordCreateForm } from '@/hooks/useRecordCreateForm';

function CreateRecordModal({ isOpen, onClose, onSuccess, recordType, onSubmitApi, canCreateGlobal = false, initialName = '' }) {
  const {
    name,
    description,
    isGlobal,
    submitting,
    errors,
    setIsGlobal,
    handleNameChange,
    handleDescriptionChange,
    reset,
    submit,
    resetWith,
  } = useRecordCreateForm(recordType, { initialName });
  // The footer sits outside the form element and reaches it by id.
  const formId = useId();

  // Seed on the open transition only. Keyed on `isOpen` alone so a parent
  // re-render can't overwrite a name the user has already started editing.
  useEffect(() => {
    if (isOpen) resetWith();
    // resetWith is stable and reads the latest seed from a ref.
  }, [isOpen]);

  const handleClose = useCallback(() => {
    if (!submitting) {
      reset();
      onClose();
    }
  }, [submitting, reset, onClose]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const created = await submit(() =>
      onSubmitApi({
        name: name.trim(),
        description: description.trim() || null,
        ...(canCreateGlobal && { isGlobal }),
      }),
    );
    if (created) {
      reset();
      onClose();
      if (onSuccess) {
        onSuccess(created);
      }
    }
  };

  const actions = (
    <MasterModalActions
      onCancel={handleClose}
      formId={formId}
      confirmLabel={`Create ${recordType}`}
      isBusy={submitting}
      busyLabel="Creating..."
    />
  );

  // BaseModal renders into <body> of its own accord, which is exactly what this
  // modal needs: it owns a <form>, and the components that open it — a selector
  // sitting inside some other form — would otherwise nest one form in another,
  // and the inner submit would save the enclosing record as well.
  return (
    <BaseModal
      isOpen={isOpen}
      onClose={handleClose}
      title={`Create New ${recordType}`}
      maxWidth="sm"
      showAudit={false}
      actions={actions}
    >
      <form id={formId} onSubmit={handleSubmit} className="space-y-4">
        {/* Name */}
        <div>
          <TextTypeField
            label={`${recordType} Name`}
            required
            value={name}
            onChange={handleNameChange}
            disabled={submitting}
            error={errors.name || ''}
            placeholder={`Enter ${recordType.toLowerCase()} name`}
          />
        </div>

        {/* Description */}
        <div>
          <TextareaTypeField
            label="Description"
            value={description}
            onChange={handleDescriptionChange}
            disabled={submitting}
            rows={3}
            error={errors.description || ''}
            placeholder={`Enter ${recordType.toLowerCase()} description (optional)`}
          />
        </div>

        {/* Global toggle - only for super users */}
        {canCreateGlobal && (
          <div className="flex items-start gap-2 p-2 bg-purple-50 border border-purple-200 rounded">
            <CheckboxTypeField
              mode="bare"
              id="entity-isGlobal"
              checked={isGlobal}
              onChange={(e) => setIsGlobal(e.target.checked)}
              disabled={submitting}
              className="mt-0.5"
            />
            <label htmlFor="entity-isGlobal" className="text-xs text-purple-900 select-none">
              <span className="inline-flex items-center gap-1 font-medium">
                <Globe className="w-3 h-3" />
                Create as global {recordType.toLowerCase()}
              </span>
              <p className="text-purple-700 mt-0.5">
                Available to every company instead of just yours.
              </p>
            </label>
          </div>
        )}
      </form>
    </BaseModal>
  );
}

CreateRecordModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  /** Receives the created record, so a picker can select what was just made. */
  onSuccess: PropTypes.func,
  recordType: PropTypes.string.isRequired,
  onSubmitApi: PropTypes.func.isRequired,
  canCreateGlobal: PropTypes.bool,
  /** Pre-fills the name field each time the modal opens. */
  initialName: PropTypes.string,
};

export { CreateRecordModal };
