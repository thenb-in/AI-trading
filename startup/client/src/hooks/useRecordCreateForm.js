import { useCallback, useRef, useState } from 'react';
import { toast } from 'react-toastify';

const NAME_MIN = 2;
const NAME_MAX = 50;
const DESCRIPTION_MAX = 500;


function useRecordCreateForm(recordType, { initialName = '' } = {}) {
  const [name, setName] = useState(initialName);
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

  // `seedName` is the value a fresh form opens with — e.g. what the user typed
  // into the dropdown that offered to create this record. Held in a ref so a
  // later render can't retroactively rewrite a form the user is already typing
  // into; callers re-seed deliberately via `resetWith`.
  const seedNameRef = useRef(initialName);
  seedNameRef.current = initialName;

  const reset = useCallback(() => {
    setName('');
    setDescription('');
    setIsGlobal(false);
    setErrors({});
  }, []);

  /** Clear the form and open it on a starting name (defaults to the seed). */
  const resetWith = useCallback((startingName) => {
    setName(startingName ?? seedNameRef.current ?? '');
    setDescription('');
    setIsGlobal(false);
    setErrors({});
  }, []);

  const validate = useCallback(() => {
    const newErrors = {};
    const trimmedName = name.trim();
    if (!trimmedName) {
      newErrors.name = `${recordType} name is required`;
    } else if (trimmedName.length < NAME_MIN) {
      newErrors.name = `${recordType} name must be at least ${NAME_MIN} characters`;
    } else if (trimmedName.length > NAME_MAX) {
      newErrors.name = `${recordType} name cannot exceed ${NAME_MAX} characters`;
    }
    if (description && description.trim().length > DESCRIPTION_MAX) {
      newErrors.description = `Description cannot exceed ${DESCRIPTION_MAX} characters`;
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [name, description, recordType]);

  const submit = useCallback(
    async (createRequest) => {
      if (!validate()) return null;
      setSubmitting(true);
      try {
        const response = await createRequest();
        toast.success(`${recordType} created successfully!`);
        // The record just written, so a caller can go straight to selecting
        // what the user has this moment made. Truthy either way, for callers
        // that only ask whether it worked.
        return response?.data?.data || response?.data || {};
      } catch (error) {
        toast.error(error?.message || `Failed to create ${recordType.toLowerCase()}`);
        return null;
      } finally {
        setSubmitting(false);
      }
    },
    [validate, recordType],
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
    resetWith,
    validate,
    submit,
  };
}

export { useRecordCreateForm };
