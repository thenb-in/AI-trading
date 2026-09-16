import { createContext, useContext, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import PropTypes from 'prop-types';
import { BaseModal, recordTitle } from './BaseModal';
import { useModalRecord } from './useModalRecord';
import { FormFooter } from '../FormFooter';
import { DEFAULT_WORKFLOW, amendCopy } from '../../workflow/workflow';
import { useWorkflow } from '../../workflow/useWorkflow';
import { FormBlockedFieldContext, FormEditableContext } from '../../fields/shared/formEditable';

const FormModalContext = createContext(null);
const NOT_BLOCKED = { message: '', field: '' };

/**
 * A BaseModal that is a form: header from BaseModal, the caller's fields in
 * the body, and a footer of what the record's workflow allows — so no form
 * writes its own <form>, footer or workflow buttons.
 *
 * Every form has a workflow: `DEFAULT_WORKFLOW` (one `saved` status) unless one
 * is given with the `record`. The footer offers its actions and runs each one's
 * default (see workflow.js); `hooks` override them per action key, `showWhen`
 * narrows one to the records it suits (a job card is never cancelled on its
 * own), and `onAmend(copy)` opens the copy an amend makes. `masterName` ("UOM")
 * names the record and turns permission verbs into names (update_uom);
 * `permissions` names them outright (a BaseMaster's keys).
 *
 * Base fields inside lock themselves while the record is not editable. A form
 * that needs more (a field shown only once approved) reads the workflow back
 * from `useFormModal`. A form's buttons that are not workflow actions
 * (Create PO...) go in `<FormModalActions>`.
 *
 * The record comes whole as `record` (a master page's row), or as `recordId`
 * with `loadRecord` (a picker's pick), in which case it is loaded on open and
 * the body waits for it. Children that need it are a function of the record.
 *
 * The footer sits outside the scrolling body and reaches the form through the
 * `form` attribute, so Save stays in view on a long form and the browser still
 * checks required fields first.
 */
const FormModal = ({
  isEditMode: isEditModeProp,
  createLabel = 'Create',
  updateLabel = 'Update',
  savingLabel = 'Saving...',
  workflow = DEFAULT_WORKFLOW,
  record: givenRecord,
  recordId,
  loadRecord,
  masterName,
  permissions,
  hooks = {},
  showWhen = {},
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
  // Why the form cannot be saved as it stands (useFormModal's validate), and the field it
  // names if any; an empty message when it can be saved.
  const [blocked, setBlocked] = useState(NOT_BLOCKED);
  const blockedReason = blocked.message;
  const [actionsSlot, setActionsSlot] = useState(null);
  const { record, isLoading } = useModalRecord({
    isOpen: modalProps.isOpen,
    record: givenRecord,
    recordId,
    loadRecord,
    label: masterName,
    onClose,
  });
  const isEditMode = isEditModeProp ?? Boolean(record?.id ?? recordId);
  const recordWorkflow = useWorkflow({
    workflow,
    record,
    masterName,
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
    // The browser's own check of required and constrained fields, then the form's own.
    validate: () => formRef.current.reportValidity() && !blockedReason,
    submit: (args) => registrationRef.current.onSubmit(args),
    formData: () => registrationRef.current.formData,
  };

  // Takes the user to the field the reason names: scrolled into view and focused.
  const showBlockedField = () => {
    const target = formRef.current.querySelector(`[name="${blocked.field}"], [data-field="${blocked.field}"]`);
    if (!target) return;
    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    const focusable = target.matches('input, textarea, select') ? target : target.querySelector('input, textarea, select, [tabindex]');
    focusable?.focus({ preventScroll: true });
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    // A form can open another FormModal (an inline creator); React carries the inner
    // submit up through the portal, and it must not save the outer form too.
    event.stopPropagation();
    // Enter in a field submits too, past the disabled Save.
    if (blockedReason) return undefined;
    return save(() => form.submit({}));
  };

  return (
    <BaseModal
      {...modalProps}
      title={modalProps.title ?? recordTitle({ masterName, record, isNew: !isEditMode, isEditable: recordWorkflow.isEditable })}
      onClose={onClose}
      actions={
        <FormFooter
          formId={formId}
          form={form}
          workflow={recordWorkflow}
          record={record}
          hooks={hooks}
          showWhen={showWhen}
          onAmend={onAmend && (() => onAmend(amendCopy(workflow, record)))}
          run={save}
          isSaving={isSaving}
          hasForm={hasForm}
          blockedReason={blockedReason}
          blockedField={blocked.field}
          onShowBlockedField={showBlockedField}
          actionsRef={setActionsSlot}
          submitLabel={isEditMode ? updateLabel : createLabel}
          savingLabel={savingLabel}
        />
      }
    >
      <FormModalContext.Provider value={{ registrationRef, save, isSaving, setHasForm, setBlocked, actionsSlot, workflow: recordWorkflow }}>
        <FormBlockedFieldContext.Provider value={blocked.field ? blocked : null}>
        <FormEditableContext.Provider value={recordWorkflow.isEditable}>
          <form ref={formRef} id={formId} onSubmit={handleSubmit} className="space-y-4">
            {isLoading ? <p className="py-6 text-sm text-gray-500">{`Loading ${masterName}...`}</p> : null}
            {!isLoading && typeof children === 'function' ? children(record) : null}
            {!isLoading && typeof children !== 'function' ? children : null}
          </form>
        </FormEditableContext.Provider>
        </FormBlockedFieldContext.Provider>
      </FormModalContext.Provider>
    </BaseModal>
  );
};

FormModal.propTypes = {
  isEditMode: PropTypes.bool,
  createLabel: PropTypes.string,
  updateLabel: PropTypes.string,
  savingLabel: PropTypes.string,
  workflow: PropTypes.object,
  /** The record open in the form, whole; its status is read from the workflow's statusKey. */
  record: PropTypes.object,
  /** The record's id, when only that is known; `loadRecord` reads the record on open. */
  recordId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  /** (id) => Promise<record>. */
  loadRecord: PropTypes.func,
  /** The master in words ("Sales Order"), usually from a masters constant. */
  masterName: PropTypes.string.isRequired,
  permissions: PropTypes.objectOf(PropTypes.oneOfType([PropTypes.string, PropTypes.arrayOf(PropTypes.string)])),
  /** { [action key]: ({ record, formData, to }) => ..., isEditable: ({ status, record, isEditable }) => boolean } */
  hooks: PropTypes.objectOf(PropTypes.func),
  /** { [action key]: (record) => boolean } — offers an action only on the records it suits, as on a list. */
  showWhen: PropTypes.objectOf(PropTypes.func),
  /** Opens the copy an amend makes; without it (and without an amend hook) Amend is not offered. */
  onAmend: PropTypes.func,
  onClose: PropTypes.func.isRequired,
  /** The fields; a function of the record where they start from it. */
  children: PropTypes.oneOfType([PropTypes.node, PropTypes.func]),
};

/**
 * Registers the form with its FormModal: `onSubmit({ to, done })` saves it —
 * `to` is the status to save with when a workflow action runs it (Send for
 * Approval, Approve...), left out for Save; `done` words the toast
 * ("approved"). `formData` is handed to the screen's workflow hooks.
 * `validate()` is required: it says why the form cannot be saved as it stands
 * ("Name is required", a line short of stock), or '' when it can. It returns
 * the message, or `{ message, field }` where `field` is the input's `name` (or
 * an element's `data-field`): the reason then takes the user to that field, and
 * a base field of that name shows the message. While it has a reason, Save is
 * disabled and shows it before anyone presses it, and no action saves the form,
 * so a form's checks live here rather than in its submit handler.
 * Returns `save(run)`, which runs a
 * form's own action under the footer spinner, `isSaving`, and `workflow` —
 * where the record stands (useWorkflow's result).
 */
const useFormModal = (onSubmit, formData, validate) => {
  const { registrationRef, save, isSaving, setHasForm, setBlocked, workflow } = useContext(FormModalContext);
  // Before the registration below, so the footer's first render already sees them.
  useLayoutEffect(() => {
    registrationRef.current = { onSubmit, formData };
  });
  useLayoutEffect(() => {
    setHasForm(true);
    return () => setHasForm(false);
  }, [setHasForm]);
  const reason = validate() || '';
  const message = typeof reason === 'string' ? reason : reason.message;
  const field = typeof reason === 'string' ? '' : reason.field || '';
  useLayoutEffect(() => {
    setBlocked({ message, field });
    return () => setBlocked(NOT_BLOCKED);
  }, [setBlocked, message, field]);
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
