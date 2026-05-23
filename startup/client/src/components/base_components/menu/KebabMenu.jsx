import { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { MoreVertical } from 'lucide-react';

/**
 * Generic kebab (3-dot) overflow menu. Pass an array of `actions`; renders a
 * trigger button that toggles a right-aligned dropdown. Items with
 */
const KebabMenu = ({
  actions,
  className = '',
  menuClassName = '',
  ariaLabel = 'More actions',
  align = 'right',
}) => {
  const containerRef = useRef(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    const handleEscape = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open]);

  if (!actions?.length) return null;

  const alignmentClass = align === 'left' ? 'left-0' : 'right-0';
  const handleToggleOpen = () => {
    setOpen((prev) => !prev);
  };

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <button
        type="button"
        onClick={handleToggleOpen}
        aria-label={ariaLabel}
        aria-haspopup="menu"
        aria-expanded={open}
        className="inline-flex items-center justify-center h-10 w-10 text-gray-700 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors"
      >
        <MoreVertical className="h-5 w-5" />
      </button>
      {open && (
        <div
          role="menu"
          className={`absolute ${alignmentClass} top-full mt-2 w-52 bg-white border border-gray-200 rounded-lg shadow-lg z-50 py-1 ${menuClassName}`}
        >
          {actions.map(({ icon: Icon, label, onClick, disabled, spinning, primary }, idx) => {
            const handleMenuItemClick = () => {
              setOpen(false);
              onClick?.();
            };

            return (
              <div key={label}>
                {primary && idx > 0 && <div className="my-1 border-t border-gray-100" />}
                <button
                  type="button"
                  role="menuitem"
                  onClick={handleMenuItemClick}
                  disabled={disabled}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm disabled:opacity-60 disabled:cursor-not-allowed text-left ${
                    primary
                      ? 'text-blue-600 font-medium hover:bg-blue-50'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {Icon && (
                    <Icon className={`h-4 w-4 flex-shrink-0 ${spinning ? 'animate-spin' : ''}`} />
                  )}
                  <span>{label}</span>
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

KebabMenu.propTypes = {
  actions: PropTypes.arrayOf(
    PropTypes.shape({
      icon: PropTypes.elementType,
      label: PropTypes.string.isRequired,
      onClick: PropTypes.func,
      disabled: PropTypes.bool,
      spinning: PropTypes.bool,
      primary: PropTypes.bool,
    }),
  ).isRequired,
  className: PropTypes.string,
  menuClassName: PropTypes.string,
  ariaLabel: PropTypes.string,
  align: PropTypes.oneOf(['left', 'right']),
};

export { KebabMenu };
