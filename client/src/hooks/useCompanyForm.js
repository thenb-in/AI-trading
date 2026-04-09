import { useState, useCallback } from 'react';

const sanitizeName = (value) => value.replace(/[<>&]/g, '').slice(0, 80);
const sanitizeCompanyId = (value) => value.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 50);

const INITIAL_FORM = { name: '', companyId: '', mobileApp: false, desktopWeb: true, mobileWeb: false };

function useCompanyForm() {
  const [form, setForm] = useState(INITIAL_FORM);
  const [touched, setTouched] = useState(false);

  const isValid = form.name.trim().length >= 2;

  const handleNameChange = useCallback((e) => {
    setForm((f) => ({ ...f, name: sanitizeName(e.target.value) }));
  }, []);

  const handleCompanyIdChange = useCallback((e) => {
    setForm((f) => ({ ...f, companyId: sanitizeCompanyId(e.target.value) }));
  }, []);

  const handleToggleChange = useCallback((field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.checked }));
  }, []);

  const handleSubmit = useCallback((onSubmit) => async (e) => {
    e.preventDefault();
    setTouched(true);
    if (form.name.trim().length < 2) return;
    await onSubmit(form);
  }, [form]);

  const resetForm = useCallback(() => {
    setForm(INITIAL_FORM);
    setTouched(false);
  }, []);

  return {
    form,
    touched,
    isValid,
    handleNameChange,
    handleCompanyIdChange,
    handleToggleChange,
    handleSubmit,
    resetForm,
  };
}

export { useCompanyForm };
