import { createElement } from 'react';
import PropTypes from 'prop-types';

const BUTTON_TONES = {
  gray: 'bg-gray-600 hover:bg-gray-700',
  amber: 'bg-amber-600 hover:bg-amber-700',
  green: 'bg-green-600 hover:bg-green-700',
  red: 'bg-red-600 hover:bg-red-700',
  orange: 'bg-orange-600 hover:bg-orange-700',
  blue: 'bg-blue-600 hover:bg-blue-700',
  purple: 'bg-purple-600 hover:bg-purple-700',
  teal: 'bg-teal-600 hover:bg-teal-700',
};

const WorkflowButton = ({ action, label, record, onRun, busy }) => {
  const handleClick = () => {
    const question = action.confirm?.({ label, record });
    if (question && !window.confirm(question)) return;
    onRun(action);
  };
  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={busy}
      className={`flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed ${BUTTON_TONES[action.tone] ?? BUTTON_TONES.gray}`}
    >
      {createElement(action.icon, { className: 'w-4 h-4' })}
      {action.label}
    </button>
  );
};

WorkflowButton.propTypes = {
  action: PropTypes.object.isRequired,
  label: PropTypes.string.isRequired,
  record: PropTypes.object,
  onRun: PropTypes.func.isRequired,
  busy: PropTypes.bool.isRequired,
};

/**
 * A button for each action a record offers (`workflow` is useWorkflow's result)
 * that `isOffered` lets through — all but Save, which the form footer draws as
 * its submit button. A click asks the action's confirm question, then calls
 * `onRun(action)`.
 */
const WorkflowButtons = ({ workflow, record, isOffered, onRun, busy }) => workflow.actions
  .filter((action) => !action.submit && isOffered(action))
  .map((action) => (
    <WorkflowButton key={action.key} action={action} label={workflow.label} record={record} onRun={onRun} busy={busy} />
  ));

WorkflowButtons.propTypes = {
  workflow: PropTypes.shape({
    label: PropTypes.string.isRequired,
    actions: PropTypes.arrayOf(PropTypes.object).isRequired,
  }).isRequired,
  record: PropTypes.object,
  isOffered: PropTypes.func.isRequired,
  onRun: PropTypes.func.isRequired,
  busy: PropTypes.bool.isRequired,
};

export { WorkflowButtons };
