import PropTypes from 'prop-types';

/** A menu row that acts rather than picks: accept what was typed, or create it. */
function MenuActionRow({ isActive, onClick, className, children }) {
  return (
    <div
      role="option"
      aria-selected={false}
      data-active={isActive}
      onClick={onClick}
      className={`px-3 py-2 text-sm cursor-pointer text-blue-700 hover:bg-blue-50 ${className} ${
        isActive ? 'ring-1 ring-inset ring-blue-400 bg-blue-50' : ''
      }`}
    >
      {children}
    </div>
  );
}

MenuActionRow.propTypes = {
  isActive: PropTypes.bool.isRequired,
  onClick: PropTypes.func.isRequired,
  /** Which edge separates it from the options. */
  className: PropTypes.string.isRequired,
  children: PropTypes.node.isRequired,
};

export { MenuActionRow };
