import PropTypes from 'prop-types';

/**
 * A secondary button in a master's header bar, beside Refresh and Add.
 *
 * `extraHeaderActions` is a render prop, so every master that wanted one of these was
 * hand-writing the same twelve-class string — which is how two masters end up looking
 * subtly different after somebody tunes the padding in one of them. The styling belongs
 * here once; a master supplies the label and what it does.
 *
 * Deliberately not a general Button: the header bar has exactly one shape of secondary
 * action, and a component that took `variant` would be inviting a second.
 */
const MasterHeaderAction = ({ label, onClick, icon, disabled = false, title }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    title={title}
    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
  >
    {icon}
    {label}
  </button>
);

MasterHeaderAction.propTypes = {
  label: PropTypes.node.isRequired,
  onClick: PropTypes.func.isRequired,
  icon: PropTypes.node,
  disabled: PropTypes.bool,
  title: PropTypes.string,
};

export { MasterHeaderAction };
