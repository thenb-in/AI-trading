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

export { FormEditableContext, useFieldDisabled };
