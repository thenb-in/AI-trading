import { createContext, useContext, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import PropTypes from 'prop-types';
import { MasterModal } from './MasterModal';
import { FormFooter } from '../FormFooter';

const FormModalContext = createContext(null);

/**
 * A MasterModal that is a form: header from MasterModal, the caller's fields in
 * the body, and the Cancel + Save footer — so no form writes its own <form> or
 * footer. The fields hand over their save with `useFormModal(onSubmit)`; the
 * modal shows the spinner until that promise settles. A form adds its own
 * footer buttons (Approve, Send for Approval, Create PO...) with
 * `<FormModalActions>`, and runs them through `save` so every button shares
 * the one spinner.
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
  // Save shows only once a form has registered what it runs (not while the body is still loading).
  const [canSubmit, setCanSubmit] = useState(false);
  const [actionsSlot, setActionsSlot] = useState(null);

  const save = async (run) => {
    setIsSaving(true);
    try {
      await run();
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    // A form can open another FormModal (an inline creator); React carries the inner
    // submit up through the portal, and it must not save the outer form too.
    event.stopPropagation();
    return save(submitRef.current);
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
          canSubmit={canSubmit}
          actionsRef={setActionsSlot}
          submitLabel={isEditMode ? updateLabel : createLabel}
          savingLabel={savingLabel}
        />
      }
    >
      <FormModalContext.Provider value={{ submitRef, save, isSaving, setCanSubmit, actionsSlot }}>
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

/**
 * Registers what Save runs. Called by the fields rendered inside a FormModal.
 * `canSubmit: false` hides Save (a document past draft). Returns `save(run)`, which
 * runs a form's own action under the footer spinner, and `isSaving`.
 */
const useFormModal = (onSubmit, { canSubmit = true } = {}) => {
  const { submitRef, save, isSaving, setCanSubmit } = useContext(FormModalContext);
  useEffect(() => {
    submitRef.current = onSubmit;
  });
  useLayoutEffect(() => {
    setCanSubmit(canSubmit);
    return () => setCanSubmit(false);
  }, [canSubmit, setCanSubmit]);
  return { save, isSaving };
};

// Buttons a form adds to the footer, before Cancel.
const FormModalActions = ({ children }) => {
  const { actionsSlot } = useContext(FormModalContext);
  return actionsSlot ? createPortal(children, actionsSlot) : null;
};

FormModalActions.propTypes = {
  children: PropTypes.node,
};

export { FormModal, useFormModal, FormModalActions };
