import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { toast } from 'react-toastify';
import { FormFooter } from './FormFooter';
import { hasPermission } from '@utils/hasPermission';
import { useDataContext } from '@context/useDataContext';


const MasterFieldsForm = ({
  isOpen,
  onClose,
  onSaved,
  initialData,
  fields,
  entityLabel,
  createPermission,
  updatePermission,
  createRow,
  updateRow,
}) => {
  const { userData } = useDataContext();
  const [formData, setFormData] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const isEditMode = !!initialData && !!initialData.id;

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    const seed = {};
    fields.forEach((field) => {
      seed[field.name] = (isEditMode && initialData[field.name]) || '';
    });
    setFormData(seed);
    setError('');
  }, [isOpen, initialData, isEditMode, fields]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (error) {
      setError('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const verb = isEditMode ? 'update' : 'create';

    if (!hasPermission(userData, isEditMode ? updatePermission : createPermission)) {
      toast.error(`You are not authorized to ${isEditMode ? 'update' : 'add'} this table`);
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = isEditMode
        ? await updateRow(initialData.id, formData)
        : await createRow(formData);

      if (response.data.success) {
        toast.success(`${entityLabel} ${isEditMode ? 'updated' : 'created'} successfully!`);
        onSaved(response.data.data);
        onClose();
        return;
      }
      setError(response.data.message || `Failed to ${verb} ${entityLabel.toLowerCase()}`);
    } catch (submitError) {
      const duplicate = submitError.response?.data?.error === 'DUPLICATE_ENTRY';
      setError(
        submitError.response?.data?.message
        || (duplicate
          ? `${entityLabel} with this code already exists`
          : `Failed to ${verb} ${entityLabel.toLowerCase()}`)
      );
    } finally {
      setIsLoading(false);
    }
  };

  const inputClass = 'w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500';

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          {error}
        </div>
      )}

      {fields.map((field) => {
        const locked = Boolean(field.lockedOnEdit && isEditMode);
        const shared = {
          id: field.name,
          name: field.name,
          value: formData[field.name] ?? '',
          onChange: handleChange,
          required: Boolean(field.required),
          placeholder: field.placeholder,
        };

        return (
          <div key={field.name}>
            <label htmlFor={field.name} className="block text-sm font-medium text-gray-700 mb-1">
              {field.label}{field.required ? ' *' : ''}
            </label>
            {field.type === 'textarea' ? (
              <textarea {...shared} rows={field.rows || 4} className={inputClass} />
            ) : (
              <input
                {...shared}
                type="text"
                disabled={locked}
                className={`${inputClass} ${locked ? 'bg-gray-100 cursor-not-allowed' : ''}`}
              />
            )}
            {locked && (
              <p className="mt-1 text-xs text-gray-500">{field.label} cannot be changed</p>
            )}
            {!locked && field.help && (
              <p className="mt-1 text-xs text-gray-500">{field.help}</p>
            )}
          </div>
        );
      })}

      <FormFooter
        onClose={onClose}
        isLoading={isLoading}
        isEditMode={isEditMode}
        createLabel="Save"
        updateLabel="Update"
        creatingLabel="Saving..."
      />
    </form>
  );
};

MasterFieldsForm.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSaved: PropTypes.func.isRequired,
  initialData: PropTypes.object,
  fields: PropTypes.array.isRequired,
  entityLabel: PropTypes.string.isRequired,
  createPermission: PropTypes.string.isRequired,
  updatePermission: PropTypes.string.isRequired,
  createRow: PropTypes.func.isRequired,
  updateRow: PropTypes.func.isRequired,
};

export { MasterFieldsForm };
