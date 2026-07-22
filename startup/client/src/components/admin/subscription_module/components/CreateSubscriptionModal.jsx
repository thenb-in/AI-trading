import { useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import { X, Loader2, Globe } from 'lucide-react';
import { toast } from 'react-toastify';
import { useEscapeKey } from '@/hooks/useEscapeKey';
import { ApiService } from '@services/ApiService';
import { useDataContext } from '@context/useDataContext';
import { useSubscriptionPermissionDraft } from '../hooks/useSubscriptionPermissionDraft';
import { SubscriptionPermissionEditor } from './SubscriptionPermissionEditor';

const NAME_MIN = 2;
const NAME_MAX = 50;
const DESCRIPTION_MAX = 500;


function CreateSubscriptionModal({ isOpen, onClose, onSuccess, permissions = [] }) {
  const { userData } = useDataContext();
  const canCreateGlobal = !!userData?.isSupportUser;

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isGlobal, setIsGlobal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  const draft = useSubscriptionPermissionDraft();

  useEscapeKey(onClose, isOpen);

  const resetForm = useCallback(() => {
    setName('');
    setDescription('');
    setIsGlobal(false);
    setErrors({});
    draft.reset([]);
  }, [draft]);

  const handleClose = useCallback(() => {
    if (!submitting) {
      resetForm();
      onClose();
    }
  }, [submitting, resetForm, onClose]);

  const handleBackdropClick = useCallback((e) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  }, [handleClose]);

  const handleNameChange = useCallback((e) => {
    setName(e.target.value);
    setErrors((prev) => (prev.name ? { ...prev, name: null } : prev));
  }, []);

  const handleDescriptionChange = useCallback((e) => {
    setDescription(e.target.value);
    setErrors((prev) => (prev.description ? { ...prev, description: null } : prev));
  }, []);

  const validate = () => {
    const newErrors = {};
    const trimmedName = name.trim();
    if (!trimmedName) {
      newErrors.name = 'Subscription name is required';
    } else if (trimmedName.length < NAME_MIN) {
      newErrors.name = `Subscription name must be at least ${NAME_MIN} characters`;
    } else if (trimmedName.length > NAME_MAX) {
      newErrors.name = `Subscription name cannot exceed ${NAME_MAX} characters`;
    }
    if (description && description.trim().length > DESCRIPTION_MAX) {
      newErrors.description = `Description cannot exceed ${DESCRIPTION_MAX} characters`;
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) {
      return;
    }

    setSubmitting(true);
    try {
      await ApiService.createSubscription({
        name: name.trim(),
        description: description.trim() || null,
        ...(canCreateGlobal && { isGlobal }),
        permissions: draft.changedRows, // base is empty → only the non-default picks
      });
      toast.success('Subscription created successfully!');
      resetForm();
      onClose();
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      toast.error(error?.message || 'Failed to create subscription');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4"
      onClick={handleBackdropClick}
    >
      <div
        className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-bold text-gray-900">Create New Subscription</h2>
          <button
            onClick={handleClose}
            disabled={submitting}
            className="text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="p-4 space-y-4 overflow-y-auto">
            {/* Name */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Subscription Name <span className="text-red-500">*</span>
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
                placeholder="Enter subscription name"
              />
              {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name}</p>}
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={description}
                onChange={handleDescriptionChange}
                disabled={submitting}
                rows={2}
                className={`w-full px-2 py-1.5 text-sm border rounded ${
                  errors.description
                    ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                    : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                } bg-white text-gray-900 focus:ring-1 disabled:bg-gray-100 disabled:cursor-not-allowed resize-none`}
                placeholder="Enter subscription description (optional)"
              />
              {errors.description && <p className="mt-1 text-xs text-red-600">{errors.description}</p>}
            </div>

            {/* Global toggle - only for super users */}
            {canCreateGlobal && (
              <div className="flex items-start gap-2 p-2 bg-purple-50 border border-purple-200 rounded">
                <input
                  id="subscription-isGlobal"
                  type="checkbox"
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
          </div>

          {/* Actions */}
          <div className="flex justify-between items-center gap-2 p-4 border-t bg-white">
            <span className="text-xs text-gray-600">{draft.changedRows.length} selected</span>
            <div className="flex items-center gap-2">
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
                  'Create Subscription'
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

CreateSubscriptionModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSuccess: PropTypes.func,
  permissions: PropTypes.array,
};

export { CreateSubscriptionModal };
