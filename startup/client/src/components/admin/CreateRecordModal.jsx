import { CheckboxTypeField } from '@startup/components/base_components/fields/CheckboxTypeField';
import { TextTypeField } from '@startup/components/base_components/fields/TextTypeField';
import { TextareaTypeField } from '@startup/components/base_components/fields/TextareaTypeField';
import { useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import PropTypes from 'prop-types';
import { X, Loader2, Globe } from 'lucide-react';
import { useEscapeKey } from '@/hooks/useEscapeKey';
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

  // Seed on the open transition only. Keyed on `isOpen` alone so a parent
  // re-render can't overwrite a name the user has already started editing.
  useEffect(() => {
    if (isOpen) resetWith();
    // resetWith is stable and reads the latest seed from a ref.
  }, [isOpen]);

  useEscapeKey(onClose, isOpen);

  const handleClose = useCallback(() => {
    if (!submitting) {
      reset();
      onClose();
    }
  }, [submitting, reset, onClose]);

  const handleBackdropClick = useCallback((e) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  }, [handleClose]);

  const handleStopPropagation = useCallback((e) => {
    e.stopPropagation();
  }, []);

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

  if (!isOpen) return null;

  // Rendered into <body> rather than where it was declared. This modal owns a
  // <form>, and the components that open it — a selector sitting inside some
  // other form — would otherwise nest one form in another: the inner submit
  // bubbles to the outer onSubmit, saving the enclosing record every time
  // someone creates a related one.
  return createPortal(
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50"
      onClick={handleBackdropClick}
    >
      <div
        className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4"
        onClick={handleStopPropagation}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-bold text-gray-900">Create New {recordType}</h2>
          <button
            onClick={handleClose}
            disabled={submitting}
            className="text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
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

          {/* Actions */}
          <div className="flex justify-end items-center gap-2 pt-2 border-t">
            <button
              type="button"
              onClick={handleClose}
              disabled={submitting}
              className="px-4 py-2 text-sm rounded text-gray-700 bg-gray-200 hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 text-sm rounded text-white bg-blue-600 hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Creating...
                </>
              ) : (
                `Create ${recordType}`
              )}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
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
