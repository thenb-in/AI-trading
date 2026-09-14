import PropTypes from 'prop-types';
import { useRef } from 'react';
import { toast } from 'react-toastify';
import { getApiErrorMessage } from '@utils/apiErrorMessage';
import { Save } from 'lucide-react';
import { ShortcutHint } from '@startup/components/base_components/ShortcutHint';
import { SHORTCUTS } from '@startup/constants/shortcuts';
import { shortcutTitle } from '@utils/keyboardShortcut';
import { useShortcut } from '@startup/hooks/useShortcut';
import { WorkflowButtons } from '../workflow/WorkflowButtons';

/**
 * FormModal's footer: what can be done to the record, from its workflow. A
 * form's own buttons (Create PO...) land in the `actionsRef` slot first, then
 * each workflow action (Send for Approval, Approve, Cancel, Amend), then Save —
 * the workflow's submit action, shown while the record can be created or
 * edited. Save submits the form named by `formId`, so the browser checks
 * required fields first, and it answers the save shortcut.
 *
 * An action runs the screen's hook of its key when there is one. Otherwise
 * amend opens the copy (offered only with `onAmend`), and a status change
 * validates the form and submits it with the new status. A hook that throws
 * is reported here, so hooks only do their work, toast and close.
 *
 * There is no close button here: Cancel cancels a document, and the modal is
 * closed from its title bar or with Esc.
 */
const FormFooter = ({ formId, form, workflow, record, hooks, onAmend, run, isSaving, hasForm, actionsRef, submitLabel, savingLabel }) => {
  const submitRef = useRef(null);
  const canSubmit = hasForm && workflow.isEditable;

  const runDefault = (action) => (action.amend
    ? onAmend()
    : form.validate() && form.submit({ to: action.to, done: action.done }));
  const runAction = (action) => run(async () => {
    try {
      await (hooks[action.key]
        ? hooks[action.key]({ record, formData: form.formData(), to: action.to })
        : runDefault(action));
    } catch (error) {
      toast.error(getApiErrorMessage(error, `Could not ${action.label.toLowerCase()} ${workflow.label}`));
    }
  });
  const isOffered = (action) => Boolean(hooks[action.key] || (action.amend ? onAmend : action.to && hasForm));

  // Clicking the button (rather than calling onSubmit) keeps the browser's own
  // required-field validation in play, exactly as a pointer click would.
  const submitViaShortcut = () => submitRef.current?.click();
  useShortcut(SHORTCUTS.SAVE, submitViaShortcut, { enabled: canSubmit && !isSaving });

  return (
    <div className="flex w-full flex-wrap justify-end gap-3 pt-4 border-t border-gray-200">
      <div ref={actionsRef} className="contents" />
      <WorkflowButtons workflow={workflow} record={record} isOffered={isOffered} onRun={runAction} busy={isSaving} />
      {canSubmit && <button
        ref={submitRef}
        type="submit"
        form={formId}
        disabled={isSaving}
        title={shortcutTitle(submitLabel, SHORTCUTS.SAVE)}
        className="flex items-center px-4 py-2 text-sm font-medium text-white border border-transparent rounded-md bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isSaving ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            {savingLabel}
          </>
        ) : (
          <>
            <Save className="h-4 w-4 mr-2" />
            {submitLabel}
            <ShortcutHint shortcut={SHORTCUTS.SAVE} />
          </>
        )}
      </button>}
    </div>
  );
};

FormFooter.propTypes = {
  formId: PropTypes.string.isRequired,
  /** FormModal's handle on the form: validate(), submit({ to, done }), formData(). */
  form: PropTypes.shape({
    validate: PropTypes.func.isRequired,
    submit: PropTypes.func.isRequired,
    formData: PropTypes.func.isRequired,
  }).isRequired,
  /** useWorkflow's result for the open record. */
  workflow: PropTypes.shape({
    label: PropTypes.string,
    isEditable: PropTypes.bool.isRequired,
    actions: PropTypes.arrayOf(PropTypes.object).isRequired,
  }).isRequired,
  record: PropTypes.object,
  hooks: PropTypes.objectOf(PropTypes.func).isRequired,
  onAmend: PropTypes.func,
  run: PropTypes.func.isRequired,
  isSaving: PropTypes.bool.isRequired,
  hasForm: PropTypes.bool.isRequired,
  actionsRef: PropTypes.func.isRequired,
  submitLabel: PropTypes.string.isRequired,
  savingLabel: PropTypes.string.isRequired,
};

export { FormFooter };
