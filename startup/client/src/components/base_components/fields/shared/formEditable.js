import { createContext, useContext } from 'react';

// Whether the record a field belongs to can still be edited. FormModal provides
// it from the record's workflow; a field outside any form is always editable.
const FormEditableContext = createContext(true);

// A field is disabled when told so, or when its form's record is locked. The
// context is read on every render, disabled or not, so the hook order holds.
const useFieldDisabled = (disabled) => {
  const isEditable = useContext(FormEditableContext);
  return Boolean(disabled) || !isEditable;
};

// The reason a form can't be saved, when its validate names a field: { field, message }.
// FormModal provides it; null when the reason names no field.
const FormBlockedFieldContext = createContext(null);

// A field shows the error it was given, or the form's reason when that reason
// names this field. Read on every render so the hook order holds.
const useFieldError = (name, error) => {
  const blocked = useContext(FormBlockedFieldContext);
  if (error) return error;
  return name && blocked?.field === name ? blocked.message : '';
};

export { FormEditableContext, FormBlockedFieldContext, useFieldDisabled, useFieldError };
