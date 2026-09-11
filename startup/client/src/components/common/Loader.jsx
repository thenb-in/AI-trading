import PropTypes from 'prop-types';

const SIZES = {
  xs: { box: 'w-4 h-4', border: 'border-2', text: 'text-xs', gap: 'gap-1.5' },
  sm: { box: 'w-8 h-8', border: 'border-2', text: 'text-xs', gap: 'gap-2' },
  md: { box: 'w-12 h-12', border: 'border-[3px]', text: 'text-sm', gap: 'gap-3' },
  lg: { box: 'w-16 h-16', border: 'border-4', text: 'text-base', gap: 'gap-4' },
};

/**
 * The one loading indicator: a dual-ring spinner with its message.
 */
function Loader({
  message = 'Loading...',
  size = 'md',
  inline = false,
  color = '',
  className = '',
}) {
  const { box, border, text, gap } = SIZES[size] || SIZES.md;
  const trackStyle = color ? { borderColor: `${color}20` } : undefined;
  const arcStyle = color ? { borderColor: 'transparent', borderTopColor: color } : undefined;

  const layout = inline
    ? `inline-flex items-center ${gap}`
    : `fixed inset-0 z-[99998] flex flex-col items-center justify-center ${gap} bg-white/60 backdrop-blur-sm`;

  return (
    <div className={`${layout} ${className}`.trim()} role="status" aria-live="polite">
      <span className={`relative inline-flex ${box}`} aria-hidden="true">
        {/* faint full track */}
        <span className={`absolute inset-0 rounded-full ${border} border-blue-100`} style={trackStyle} />
        {/* spinning accent arc */}
        <span
          className={`absolute inset-0 rounded-full ${border} border-transparent border-t-blue-600 animate-spin`}
          style={arcStyle}
        />
      </span>
      {message ? (
        <p className={`${text} font-medium text-gray-500 tracking-wide animate-pulse`}>{message}</p>
      ) : null}
      <span className="sr-only">{message || 'Loading'}</span>
    </div>
  );
}

Loader.propTypes = {
  message: PropTypes.string,
  size: PropTypes.oneOf(['xs', 'sm', 'md', 'lg']),
  inline: PropTypes.bool,
  color: PropTypes.string,
  className: PropTypes.string,
};

export { Loader };