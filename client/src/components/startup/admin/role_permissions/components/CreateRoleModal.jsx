import { useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import { X, Loader2 } from 'lucide-react';
import { ApiService } from '@services/startup/ApiService';
import { useEscapeKey } from '@/hooks/useEscapeKey';
import { toast } from 'react-toastify';
import { TextTypeField } from '@base_components/fields/TextTypeField';
import { TextareaTypeField } from '@base_components/fields/TextareaTypeField';

function CreateRoleModal({ isOpen, onClose, onSuccess }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  useEscapeKey(onClose, isOpen);

  const handleBackdropClick = useCallback((e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }, [onClose]);

  const handleNameChange = useCallback((e) => {
    setName(e.target.value);
    if (errors.name) {
      setErrors(prev => ({ ...prev, name: null }));
    }
  }, [errors.name]);

  const handleDescriptionChange = useCallback((e) => {
    setDescription(e.target.value);
    if (errors.description) {
      setErrors(prev => ({ ...prev, description: null }));
    }
  }, [errors.description]);

  const handleStopPropagation = useCallback((e) => {
    e.stopPropagation();
  }, []);

  const validate = () => {
    const newErrors = {};
    
    if (!name || !name.trim()) {
      newErrors.name = 'Role name is required';
    } else if (name.trim().length < 2) {
      newErrors.name = 'Role name must be at least 2 characters';
    } else if (name.trim().length > 50) {
      newErrors.name = 'Role name cannot exceed 50 characters';
    }

    if (description && description.trim().length > 500) {
      newErrors.description = 'Description cannot exceed 500 characters';
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
      const payload = {
        name: name.trim(),
        description: description.trim() || null
      };

      await ApiService.createRole(payload);
      
      toast.success('Role created successfully!');
      
      // Reset form
      setName('');
      setDescription('');
      setErrors({});
      
      // Close modal and refresh roles
      onClose();
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      const errorMessage = error?.message || 'Failed to create role';
      toast.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!submitting) {
      setName('');
      setDescription('');
      setErrors({});
      onClose();
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
          <h2 className="text-lg font-bold text-gray-900">Create New Role</h2>
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
          {/* Role Name */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Role Name <span className="text-red-500">*</span>
            </label>
            <TextTypeField
              value={name}
              onChange={handleNameChange}
              disabled={submitting}
              placeholder="Enter role name"
              error={errors.name || ''}
              className="px-2 py-1.5 text-sm focus:ring-1"
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
            <TextareaTypeField
              value={description}
              onChange={handleDescriptionChange}
              disabled={submitting}
              rows={3}
              placeholder="Enter role description (optional)"
              error={errors.description || ''}
              className="px-2 py-1.5 text-sm focus:ring-1 resize-none"
            />
            {errors.description && (
              <p className="mt-1 text-xs text-red-600">{errors.description}</p>
            )}
          </div>

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
                'Create Role'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

CreateRoleModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSuccess: PropTypes.func,
};

export { CreateRoleModal };

