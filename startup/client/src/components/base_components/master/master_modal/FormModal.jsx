import { createContext, useContext, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import PropTypes from 'prop-types';
import { MasterModal } from './MasterModal';
import { FormFooter } from '../FormFooter';
import { DEFAULT_WORKFLOW, amendCopy } from '../../workflow/workflow';
import { useWorkflow } from '../../workflow/useWorkflow';
import { FormEditableContext } from '../../fields/shared/formEditable';

const FormModalContext = createContext(null);

/**
 * A MasterModal that is a form: header from MasterModal, the caller's fields in
 * the body, and a footer of what the record's workflow allows — so no form
 * writes its own <form>, footer or workflow buttons.
 *
 * Every form has a workflow: `DEFAULT_WORKFLOW` (one `saved` status) unless one
 * is given with the `record`. The footer offers its actions and runs each one's
 * default (see workflow.js); `hooks` override them per action key, and
 * `onAmend(copy)` opens the copy an amend makes. `entity` turns permission verbs
 * into names (update_uom); `permissions` names them outright (a BaseMaster's keys).
 *
 * Base fields inside lock themselves while the record is not editable. A form
 * that needs more (a field shown only once approved) reads the workflow back
 * from `useFormModal`. A form's buttons that are not workflow actions
 * (Create PO...) go in `<FormModalActions>`.
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
  workflow = DEFAULT_WORKFLOW,
  record,
  entity,
  label,
  permissions,
  hooks = {},
  onAmend,
  onClose,
  children,
  ...modalProps
}) => {
  const formId = useId();
  const formRef = useRef(null);
  // What the form registered, read when a button is pressed so each sees the form as it is then.
  const registrationRef = useRef({});
  const [isSaving, setIsSaving] = useState(false);
  // Save shows only once a form has registered what it runs (not while the body is still loading).
  const [hasForm, setHasForm] = useState(false);
  const [actionsSlot, setActionsSlot] = useState(null);
  const recordWorkflow = useWorkflow({
    workflow,
    record,
    entity,
    label: label ?? entity?.replace(/_/g, ' '),
    permissions,
    hooks,
    isNew: !isEditMode,
  });

  const save = async (run) => {
    setIsSaving(true);
    try {
      await run();
    } finally {
      setIsSaving(false);
    }
  };

  const form = {
    // The browser's own check of required and constrained fields, shown on the fields.
    validate: () => formRef.current.reportValidity(),
    submit: (args) => registrationRef.current.onSubmit(args),
    formData: () => registrationRef.current.formData,
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    // A form can open another FormModal (an inline creator); React carries the inner
    // submit up through the portal, and it must not save the outer form too.
    event.stopPropagation();
    return save(() => form.submit({}));
  };

  return (
    <MasterModal
      {...modalProps}
      onClose={onClose}
      actions={
        <FormFooter
          formId={formId}
          form={form}
          workflow={recordWorkflow}
          record={record}
          hooks={hooks}
          onAmend={onAmend && (() => onAmend(amendCopy(workflow, record)))}
          run={save}
          isSaving={isSaving}
          hasForm={hasForm}
          actionsRef={setActionsSlot}
          submitLabel={isEditMode ? updateLabel : createLabel}
          savingLabel={savingLabel}
        />
      }
    >
      <FormModalContext.Provider value={{ registrationRef, save, isSaving, setHasForm, actionsSlot, workflow: recordWorkflow }}>
        <FormEditableContext.Provider value={recordWorkflow.isEditable}>
          <form ref={formRef} id={formId} onSubmit={handleSubmit} className="space-y-4">
            {children}
          </form>
        </FormEditableContext.Provider>
      </FormModalContext.Provider>
    </MasterModal>
  );
};

FormModal.propTypes = {
  isEditMode: PropTypes.bool,
  createLabel: PropTypes.string,
  updateLabel: PropTypes.string,
  savingLabel: PropTypes.string,
  workflow: PropTypes.object,
  /** The record open in the form; its status is read from the workflow's statusKey. */
  record: PropTypes.object,
  entity: PropTypes.string,
  label: PropTypes.string,
  permissions: PropTypes.objectOf(PropTypes.oneOfType([PropTypes.string, PropTypes.arrayOf(PropTypes.string)])),
  /** { [action key]: ({ record, formData, to }) => ..., isEditable: ({ status, record, isEditable }) => boolean } */
  hooks: PropTypes.objectOf(PropTypes.func),
  /** Opens the copy an amend makes; without it (and without an amend hook) Amend is not offered. */
  onAmend: PropTypes.func,
  onClose: PropTypes.func.isRequired,
  children: PropTypes.node,
};

/**
 * Registers the form with its FormModal: `onSubmit({ to, done })` saves it —
 * `to` is the status to save with when a workflow action runs it (Send for
 * Approval, Approve...), left out for Save; `done` words the toast
 * ("approved"). `formData` is handed to the screen's workflow hooks. Returns
 * `save(run)`, which runs a form's own action under the footer spinner,
 * `isSaving`, and `workflow` — where the record stands (useWorkflow's result).
 */
const useFormModal = (onSubmit, formData) => {
  const { registrationRef, save, isSaving, setHasForm, workflow } = useContext(FormModalContext);
  // Before the registration below, so the footer's first render already sees them.
  useLayoutEffect(() => {
    registrationRef.current = { onSubmit, formData };
  });
  useLayoutEffect(() => {
    setHasForm(true);
    return () => setHasForm(false);
  }, [setHasForm]);
  return { save, isSaving, workflow };
};

// A form's own buttons that are not workflow actions, first in the footer.
const FormModalActions = ({ children }) => {
  const { actionsSlot } = useContext(FormModalContext);
  return actionsSlot ? createPortal(children, actionsSlot) : null;
};

FormModalActions.propTypes = {
  children: PropTypes.node,
};

export { FormModal, useFormModal, FormModalActions };
