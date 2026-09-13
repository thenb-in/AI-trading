import { createContext, useContext, useEffect, useId, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { MasterModal } from './MasterModal';
import { FormFooter } from '../FormFooter';

const FormModalContext = createContext(null);

/**
 * A MasterModal that is a form: header from MasterModal, the caller's fields in
 * the body, and the Cancel + Save footer — so no form writes its own <form> or
 * footer. The fields hand over their save with `useFormModal(onSubmit)`; the
 * modal shows the spinner until that promise settles.
 *
 * The footer sits outside the scrolling body and reaches the form through the
 * `form` attribute, so Save stays in view on a long form and the browser still
 * checks required fields first.
 */
const FormModal = ({
  isEditMode = false,
  createLabel = 'Create',
  updateLabel = 'Update',
  savingLabel = 'Saving...',
  onClose,
  children,
  ...modalProps
}) => {
  const formId = useId();
  const submitRef = useRef(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSaving(true);
    try {
      await submitRef.current();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <MasterModal
      {...modalProps}
      onClose={onClose}
      actions={
        <FormFooter
          formId={formId}
          onClose={onClose}
          isSaving={isSaving}
          submitLabel={isEditMode ? updateLabel : createLabel}
          savingLabel={savingLabel}
        />
      }
    >
      <FormModalContext.Provider value={submitRef}>
        <form id={formId} onSubmit={handleSubmit} className="space-y-4">
          {children}
        </form>
      </FormModalContext.Provider>
    </MasterModal>
  );
};

FormModal.propTypes = {
  isEditMode: PropTypes.bool,
  createLabel: PropTypes.string,
  updateLabel: PropTypes.string,
  savingLabel: PropTypes.string,
  onClose: PropTypes.func.isRequired,
  children: PropTypes.node,
};

// Registers what Save runs. Called by the fields rendered inside a FormModal.
const useFormModal = (onSubmit) => {
  const submitRef = useContext(FormModalContext);
  useEffect(() => {
    submitRef.current = onSubmit;
  });
};

export { FormModal, useFormModal };
