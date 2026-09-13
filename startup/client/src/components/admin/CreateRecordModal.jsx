import { useCallback, useEffect } from 'react';
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
    const ok = await submit(() =>
      onSubmitApi({
        name: name.trim(),
        description: description.trim() || null,
        ...(canCreateGlobal && { isGlobal }),
      }),
    );
    if (ok) {
      reset();
      onClose();
      if (onSuccess) {
        onSuccess();
      }
    }
  };

  if (!isOpen) return null;

  return (
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
            <label className="block text-xs font-medium text-gray-700 mb-1">
              {recordType} Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={handleNameChange}
              disabled={submitting}
              className={`w-full px-2 py-1.5 text-sm border rounded ${
                errors.name
                  ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                  : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
              } bg-white text-gray-900 focus:ring-1 disabled:bg-gray-100 disabled:cursor-not-allowed`}
              placeholder={`Enter ${recordType.toLowerCase()} name`}
            />
            {errors.name && (
              <p className="mt-1 text-xs text-red-600">{errors.name}</p>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={handleDescriptionChange}
              disabled={submitting}
              rows={3}
              className={`w-full px-2 py-1.5 text-sm border rounded ${
                errors.description
                  ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                  : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
              } bg-white text-gray-900 focus:ring-1 disabled:bg-gray-100 disabled:cursor-not-allowed resize-none`}
              placeholder={`Enter ${recordType.toLowerCase()} description (optional)`}
            />
            {errors.description && (
              <p className="mt-1 text-xs text-red-600">{errors.description}</p>
            )}
          </div>

          {/* Global toggle - only for super users */}
          {canCreateGlobal && (
            <div className="flex items-start gap-2 p-2 bg-purple-50 border border-purple-200 rounded">
              <input
                id="entity-isGlobal"
                type="checkbox"
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
    </div>
  );
}

CreateRecordModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSuccess: PropTypes.func,
  recordType: PropTypes.string.isRequired,
  onSubmitApi: PropTypes.func.isRequired,
  canCreateGlobal: PropTypes.bool,
  /** Pre-fills the name field each time the modal opens. */
  initialName: PropTypes.string,
};

export { CreateRecordModal };
