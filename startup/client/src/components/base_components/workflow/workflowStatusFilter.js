import { WorkflowStatusSelector } from './WorkflowStatusSelector';

/**
 * A report or list filter on a record's status, offering its workflow's
 * statuses. Nothing picked is "all" (`allLabel` is what the field then says);
 * `overrides` sets the rest (name, label, order, default).
 */
const workflowStatusFilter = ({ workflow, allLabel = 'All Statuses', ...overrides }) => ({
  name: 'status',
  label: 'Status',
  type: 'select',
  is_standard: false,
  default: 'all',
  placeholder: allLabel,
  Selector: WorkflowStatusSelector,
  selectorProps: { workflow },
  ...overrides,
});

export { workflowStatusFilter };
