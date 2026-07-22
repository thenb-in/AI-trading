import { useCallback, useState } from 'react';
import { toast } from 'react-toastify';

const NAME_MIN = 2;
const NAME_MAX = 50;
const DESCRIPTION_MAX = 500;


function useEntityCreateForm(label) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isGlobal, setIsGlobal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  const handleNameChange = useCallback((e) => {
    setName(e.target.value);
    setErrors((prev) => (prev.name ? { ...prev, name: null } : prev));
  }, []);

  const handleDescriptionChange = useCallback((e) => {
    setDescription(e.target.value);
    setErrors((prev) => (prev.description ? { ...prev, description: null } : prev));
  }, []);

  const reset = useCallback(() => {
    setName('');
    setDescription('');
    setIsGlobal(false);
    setErrors({});
  }, []);

  const validate = useCallback(() => {
    const newErrors = {};
    const trimmedName = name.trim();
    if (!trimmedName) {
      newErrors.name = `${label} name is required`;
    } else if (trimmedName.length < NAME_MIN) {
      newErrors.name = `${label} name must be at least ${NAME_MIN} characters`;
    } else if (trimmedName.length > NAME_MAX) {
      newErrors.name = `${label} name cannot exceed ${NAME_MAX} characters`;
    }
    if (description && description.trim().length > DESCRIPTION_MAX) {
      newErrors.description = `Description cannot exceed ${DESCRIPTION_MAX} characters`;
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [name, description, label]);

  const submit = useCallback(
    async (createRequest) => {
      if (!validate()) return false;
      setSubmitting(true);
      try {
        await createRequest();
        toast.success(`${label} created successfully!`);
        return true;
      } catch (error) {
        toast.error(error?.message || `Failed to create ${label.toLowerCase()}`);
        return false;
      } finally {
        setSubmitting(false);
      }
    },
    [validate, label],
  );

  return {
    name,
    description,
    isGlobal,
    submitting,
    errors,
    setIsGlobal,
    handleNameChange,
    handleDescriptionChange,
    reset,
    validate,
    submit,
  };
}

export { useEntityCreateForm };
