import { createElement } from 'react';
import { toast } from 'react-toastify';
import { useDataContext } from '@startup/context/useDataContext';
import { hasPermission } from '@startup/utils/hasPermission';
import { getApiErrorMessage } from '@utils/apiErrorMessage';
import { actionsOf, permissionFor, statusOf } from './workflow';

// MasterTable colours row buttons by type rather than tone.
const ROW_TYPES = { red: 'danger', green: 'success', amber: 'warning', orange: 'warning', blue: 'primary', purple: 'primary' };

/**
 * The workflow's actions as MasterTable row actions. A list has no form to save,
 * so each action runs the screen's hook of the same key and is listed only when
 * there is one and the user holds its permission; it shows on rows in one of its
 * `from` statuses — narrowed further by `showWhen[key](record)` where a row needs
 * more (a job card is never cancelled on its own).
 *
 * A hook gets `{ record, to }`. For a status change the row action asks the
 * action's confirm question, toasts the outcome and calls `onChanged({ record, to })`
 * so the list can patch that row or refetch; amend is simply run.
 */
const useWorkflowRowActions = ({
  workflow,
  entity,
  label,
  permissions = {},
  hooks,
  showWhen = {},
  onChanged,
}) => {
  const { userData } = useDataContext();

  const runStatusChange = async (action, record) => {
    const question = action.confirm?.({ label, record });
    if (question && !window.confirm(question)) return;
    try {
      await hooks[action.key]({ record, to: action.to });
      toast.success(`${label.charAt(0).toUpperCase()}${label.slice(1)} ${action.done}`);
      onChanged({ record, to: action.to });
    } catch (error) {
      toast.error(getApiErrorMessage(error, `Could not ${action.label.toLowerCase()} ${label}`));
    }
  };

  return actionsOf(workflow)
    .filter((action) => hooks[action.key] && hasPermission(userData, permissionFor(action.permission, entity, permissions)))
    .map((action) => ({
      label: action.label,
      icon: createElement(action.icon, { className: 'w-4 h-4' }),
      type: ROW_TYPES[action.tone] ?? 'default',
      show: (row) => action.from.includes(statusOf(workflow, row[workflow.statusKey])) && (!showWhen[action.key] || showWhen[action.key](row)),
      onClick: (id, row) => (action.to ? runStatusChange(action, row) : hooks[action.key]({ record: row })),
    }));
};

export { useWorkflowRowActions };
