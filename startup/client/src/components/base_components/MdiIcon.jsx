import PropTypes from 'prop-types';

/**
 * One Material Design Icon
 */
/** Size and colour are per-use values, so they cannot be Tailwind classes. */
const glyphStyle = (size, color) => ({ fontSize: size, color, lineHeight: 1 });

function MdiIcon({ name, size = 20, color, className = '', title }) {
  if (!name) {
    return null;
  }

  return (
    <span
      className={`mdi mdi-${name} leading-none ${className}`.trim()}
      style={glyphStyle(size, color)}
      title={title}
      role={title ? 'img' : 'presentation'}
      aria-label={title || undefined}
      aria-hidden={title ? undefined : 'true'}
    />
  );
}

MdiIcon.propTypes = {
  name: PropTypes.string,
  size: PropTypes.number,
  color: PropTypes.string,
  className: PropTypes.string,
  title: PropTypes.string
};

export { MdiIcon };
