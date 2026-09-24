import PropTypes from 'prop-types';
import { Badge } from '../Badge';

/** A record's status in its workflow's words and colour. `large` for a form header, small for a list cell. */
const WorkflowStatusBadge = ({ workflow, status, large = false }) => {
  const current = status || workflow.initial;
  const meta = workflow.statuses[current];
  return <Badge tone={meta?.tone} large={large}>{meta?.label ?? current}</Badge>;
};

WorkflowStatusBadge.propTypes = {
  workflow: PropTypes.object.isRequired,
  status: PropTypes.string,
  large: PropTypes.bool,
};

export { WorkflowStatusBadge };
