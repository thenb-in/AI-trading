import PropTypes from 'prop-types';
import { useCallback, useMemo } from 'react';
import { SearchableDropdown } from '../fields/SearchableDropdown';
import { WorkflowStatusBadge } from './WorkflowStatusBadge';

/**
 * Picks a status of a workflow: its own keys, in its own words and colours, so a
 * status filter or field offers exactly the statuses a record can be in.
 */
const WorkflowStatusSelector = ({ workflow, value, onChange, multiple = false, placeholder = 'Select status', disabled }) => {
  const options = useMemo(
    () => Object.entries(workflow.statuses).map(([status, { label }]) => ({ value: status, label })),
    [workflow]
  );
  const renderStatus = useCallback(
    (option) => <WorkflowStatusBadge workflow={workflow} status={option.value} />,
    [workflow]
  );
  return (
    <SearchableDropdown
      options={options}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      disabled={disabled}
      multiple={multiple}
      renderOption={renderStatus}
    />
  );
};

WorkflowStatusSelector.propTypes = {
  /** The workflow whose statuses are offered (APPROVAL_WORKFLOW, a document's own). */
  workflow: PropTypes.shape({ statuses: PropTypes.object.isRequired }).isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.arrayOf(PropTypes.string)]),
  onChange: PropTypes.func.isRequired,
  multiple: PropTypes.bool,
  placeholder: PropTypes.string,
  disabled: PropTypes.bool,
};

export { WorkflowStatusSelector };
