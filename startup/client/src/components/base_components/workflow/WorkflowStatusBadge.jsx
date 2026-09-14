import PropTypes from 'prop-types';

const BADGE_TONES = {
  gray: 'bg-gray-100 text-gray-700',
  amber: 'bg-amber-100 text-amber-800',
  green: 'bg-green-100 text-green-800',
  red: 'bg-red-100 text-red-800',
  orange: 'bg-orange-100 text-orange-800',
  blue: 'bg-blue-100 text-blue-800',
  purple: 'bg-purple-100 text-purple-800',
  teal: 'bg-teal-100 text-teal-800',
};

/** A record's status in its workflow's words and colour. `large` for a form header, small for a list cell. */
const WorkflowStatusBadge = ({ workflow, status, large = false }) => {
  const current = status || workflow.initial;
  const meta = workflow.statuses[current];
  return (
    <span
      className={`inline-flex w-fit items-center rounded-full font-medium ${large ? 'px-3 py-1 text-sm' : 'px-2 py-0.5 text-xs'} ${BADGE_TONES[meta?.tone] ?? BADGE_TONES.gray}`}
    >
      {meta?.label ?? current}
    </span>
  );
};

WorkflowStatusBadge.propTypes = {
  workflow: PropTypes.object.isRequired,
  status: PropTypes.string,
  large: PropTypes.bool,
};

export { WorkflowStatusBadge };
