import { Ban, CheckCircle, RotateCcw, Save, Send } from 'lucide-react';
import { masterKeyOf } from '@startup/utils/masterKey';

/**
 * A workflow is what a kind of record goes through, declared once by the
 * developer: its statuses and the actions that move a record between them.
 * A FormModal's footer, a list's row actions (useWorkflowRowActions), the
 * status badge and field locking (useWorkflow) all read the same declaration,
 * so a status or a button is added in one place.
 *
 *   initial   status a new record starts in
 *   statusKey the record field holding its status; a workflow without one
 *             treats every record as being in `initial`
 *   statuses  { [stored value]: { label, tone, deletable } }
 *               deletable — the record can still be deleted in this status
 *   actions   { [key]: { label, done, from, to, amend, permission, createPermission, submit, tone, icon, confirm } }
 *               from             — statuses the action is offered in
 *               to               — status it moves the record to
 *               amend            — instead of moving the record, open a new one
 *                                  copied from it (amendCopy)
 *               permission       — a verb ('update', 'approve', 'create'); the
 *                                  masterName turns it into a permission name
 *               createPermission — the verb that offers it on a record not yet
 *                                  saved; only Save has one
 *               submit           — the form's own Save: it submits the form, so
 *                                  the browser checks required fields and the
 *                                  save shortcut answers it. A record is editable
 *                                  exactly where Save is offered.
 *               done             — past tense for the list's toast ("approved")
 *               confirm          — ({ label, record }) => the question asked first,
 *                                  or nothing to go ahead without asking
 *
 * Every action has a default, so a screen wires nothing to offer it: a status
 * change saves the form with the new status (or, on a list, runs the screen's
 * hook), and amend opens the copy. A screen overrides any of them with a hook of
 * the same key — ({ record, formData, to }) => ... — and `isEditable` with
 * ({ status, record, isEditable }) => boolean.
 *
 * Cancelled is where a document ends; amending it makes a new document from it.
 * A draft is never cancelled: nothing has happened to it yet, so it is deleted.
 *
 * Tones are colour families: gray, amber, green, red, orange, blue, purple, teal.
 */

// Save, apart from the statuses it is offered in.
const saveAction = {
  label: 'Save',
  permission: 'update',
  createPermission: 'create',
  submit: true,
  tone: 'blue',
  icon: Save,
};

/**
 * The workflow of every master that declares none: one status, `saved`, in
 * which a record is edited and deleted. It names no status field, so a record's
 * own `status` column (a report run's queued / done) is never read as one.
 */
const DEFAULT_WORKFLOW = {
  initial: 'saved',
  statuses: {
    saved: { label: 'Saved', tone: 'gray', deletable: true },
  },
  actions: {
    save: { ...saveAction, from: ['saved'] },
  },
};

const APPROVAL_WORKFLOW = {
  initial: 'draft',
  statusKey: 'status',
  statuses: {
    draft: { label: 'Draft', tone: 'gray', deletable: true },
    pending_for_approval: { label: 'Pending for Approval', tone: 'amber' },
    approved: { label: 'Approved', tone: 'green' },
    cancelled: { label: 'Cancelled', tone: 'red' },
  },
  actions: {
    save: { ...saveAction, from: ['draft'] },
    sendForApproval: {
      label: 'Send for Approval',
      done: 'sent for approval',
      from: ['draft'],
      to: 'pending_for_approval',
      permission: 'update',
      tone: 'amber',
      icon: Send,
    },
    approve: {
      label: 'Approve',
      done: 'approved',
      from: ['pending_for_approval'],
      to: 'approved',
      permission: 'approve',
      tone: 'green',
      icon: CheckCircle,
    },
    cancel: {
      label: 'Cancel',
      done: 'cancelled',
      from: ['pending_for_approval', 'approved'],
      to: 'cancelled',
      permission: 'update',
      tone: 'red',
      icon: Ban,
      confirm: ({ label }) => `Are you sure you want to cancel this ${label}?`,
    },
    amend: {
      label: 'Amend',
      from: ['cancelled'],
      amend: true,
      permission: 'create',
      tone: 'orange',
      icon: RotateCcw,
    },
  },
};

/**
 * A workflow built on another. Statuses and actions merge by key, so a kind of
 * record renames a button, adds a status or offers an action from one more
 * status without restating the rest; `null` drops an action.
 */
const extendWorkflow = (base, { initial = base.initial, statuses = {}, actions = {} }) => ({
  ...base,
  initial,
  statuses: { ...base.statuses, ...statuses },
  actions: Object.fromEntries(
    Object.entries({ ...base.actions, ...actions })
      .filter(([, action]) => action !== null)
      .map(([key, action]) => [key, { ...base.actions[key], ...action }])
  ),
});

// 'approve' on 'Stock Reconciliation' is approve_stock_reconciliation, unless
// the record names its own permission for that verb.
const permissionFor = (verb, masterName, permissions) => permissions[verb] ?? `${verb}_${masterKeyOf(masterName)}`;

// The status a record is in: its own, where the workflow keeps one, else the
// starting one. A status is matched exactly as the record stores it, so a
// workflow's keys are the app's own values ('APPR'), and a stored 0 is a status
// like any other rather than a missing one.
const statusOf = (workflow, status) => {
  const stored = status === null || status === undefined || status === '' ? null : String(status).trim();
  return (workflow.statusKey && stored) || workflow.initial;
};

const actionsOf = (workflow) => Object.entries(workflow.actions).map(([key, action]) => ({ ...action, key }));

// The new record an amend opens: the old one's content without its id, back at the workflow's first status.
const amendCopy = (workflow, record) => ({
  ...Object.fromEntries(Object.entries(record).filter(([key]) => key !== 'id')),
  ...(workflow.statusKey && { [workflow.statusKey]: workflow.initial }),
});

export { DEFAULT_WORKFLOW, APPROVAL_WORKFLOW, extendWorkflow, permissionFor, statusOf, actionsOf, amendCopy };
