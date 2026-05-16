import PropTypes from 'prop-types';

/**
 * One compact employee tile used in the dashboard error/sync sections.
 * Renders the employee photo (or a colored initial fallback) above name/code/department,
 * and wires the photo and the text block to caller-provided activate/deactivate handlers.
 */
const EmployeeCard = ({
  employee,
  onPhotoClick,
  onTextClick,
  textTitle,
  textAriaLabel,
  fallbackBg = 'bg-gray-200',
  fallbackTextColor = '',
  showInitialFallback = false,
  unknownLabel = 'Unknown Employee',
}) => {
  const hasPhoto = employee.photo && employee.photo.trim();
  const initial = (employee.employee_name || employee.emp_code || '?').charAt(0);

  return (
    <div className="flex flex-col items-center p-1.5 bg-gray-50 rounded hover:bg-gray-100 transition-colors">
      {hasPhoto ? (
        <div
          role="button"
          tabIndex={0}
          className="cursor-pointer hover:opacity-80 transition-opacity mb-1 rounded-full"
          onClick={onPhotoClick}
          onKeyDown={onPhotoClick}
          aria-label="Expand photo"
        >
          <div
            dangerouslySetInnerHTML={{
              __html: employee.photo.replace(
                /<img([^>]*)>/g,
                '<img$1 style="width: 48px; height: 48px; object-fit: cover; border-radius: 50%;" class="w-12 h-12 object-cover rounded-full">'
              ),
            }}
          />
        </div>
      ) : showInitialFallback ? (
        <div className={`w-12 h-12 rounded-full ${fallbackBg} mb-1 flex-shrink-0 flex items-center justify-center ${fallbackTextColor} text-lg font-medium`}>
          {initial}
        </div>
      ) : (
        <div className={`w-12 h-12 rounded-full ${fallbackBg} mb-1 flex-shrink-0`} />
      )}
      <div
        role="button"
        tabIndex={0}
        className="text-center w-full min-w-0 cursor-pointer hover:bg-gray-200 rounded px-1 py-0.5 transition-colors"
        onClick={onTextClick}
        onKeyDown={onTextClick}
        title={textTitle}
        aria-label={textAriaLabel}
      >
        <p className="text-xs font-medium text-gray-900 truncate px-0.5" title={employee.employee_name || unknownLabel}>
          {employee.employee_name || unknownLabel}
        </p>
        <p className="text-xs text-gray-600 truncate px-0.5" title={employee.emp_code}>
          {employee.emp_code}
        </p>
        {employee.department_name && (
          <p className="text-xs text-gray-500 truncate px-0.5" title={employee.department_name}>
            {employee.department_name}
          </p>
        )}
      </div>
    </div>
  );
};

EmployeeCard.propTypes = {
  employee: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    emp_code: PropTypes.string,
    employee_name: PropTypes.string,
    department_name: PropTypes.string,
    photo: PropTypes.string,
  }).isRequired,
  onPhotoClick: PropTypes.func,
  onTextClick: PropTypes.func.isRequired,
  textTitle: PropTypes.string.isRequired,
  textAriaLabel: PropTypes.string.isRequired,
  fallbackBg: PropTypes.string,
  fallbackTextColor: PropTypes.string,
  showInitialFallback: PropTypes.bool,
  unknownLabel: PropTypes.string,
};

export { EmployeeCard };
