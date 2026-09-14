import { useDataContext } from '@startup/context/useDataContext';
import { hasPermission } from '@startup/utils/hasPermission';
import { actionsOf, permissionFor, statusOf } from './workflow';

/**
 * Where one record stands in its workflow, for the person looking at it.
 *
 * `actions` — what can be done to it right now: on a new record, the actions
 * offered for creating (Save) that this user may create with; on a saved one,
 * the actions offered from its status that this user holds the permission for.
 * `isEditable` — Save is among them, unless the screen's `isEditable` hook says
 * otherwise. `label` names the record in confirm questions ("indent").
 * `permissions` names a permission where the verb-and-entity rule doesn't fit
 * ({ approve: 'update_bom' }).
 */
const useWorkflow = ({ workflow, record, entity, label, permissions = {}, hooks = {}, isNew = false }) => {
  const { userData } = useDataContext();
  const status = statusOf(workflow, record?.[workflow.statusKey]);
  const can = (verb) => hasPermission(userData, permissionFor(verb, entity, permissions));
  const isOffered = (action) => (isNew
    ? Boolean(action.createPermission) && can(action.createPermission)
    : action.from.includes(status) && can(action.permission));
  const actions = actionsOf(workflow).filter(isOffered);
  const canSave = actions.some((action) => action.submit);
  return {
    label,
    status,
    actions,
    isEditable: hooks.isEditable ? hooks.isEditable({ status, record, isEditable: canSave }) : canSave,
  };
};

export { useWorkflow };
