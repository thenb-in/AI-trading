import PropTypes from 'prop-types';

// Label left, control right. The fixed label column is what keeps every
// control starting at the same x.
const FieldRow = ({ icon: Icon, label, hint, required, active, children }) => (
  <div className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-start sm:gap-4">
    <div className="flex w-full items-center gap-2 sm:w-44 sm:flex-shrink-0 sm:pt-2">
      {Icon && (
        <Icon className={`h-4 w-4 flex-shrink-0 ${active ? 'text-blue-600' : 'text-gray-400'}`} />
      )}
      <span className="text-sm font-medium text-gray-700">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </span>
    </div>
    <div className="min-w-0 flex-1">
      {children}
      {hint && <p className="mt-1.5 text-xs text-gray-500">{hint}</p>}
    </div>
  </div>
);

FieldRow.propTypes = {
  icon: PropTypes.elementType,
  label: PropTypes.string.isRequired,
  hint: PropTypes.string,
  required: PropTypes.bool,
  active: PropTypes.bool,
  children: PropTypes.node
};

export { FieldRow };
