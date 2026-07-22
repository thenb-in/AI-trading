import PropTypes from 'prop-types';

const SIZES = {
  sm: { box: 'w-8 h-8', border: 'border-2', text: 'text-xs', gap: 'gap-2' },
  md: { box: 'w-12 h-12', border: 'border-[3px]', text: 'text-sm', gap: 'gap-3' },
  lg: { box: 'w-16 h-16', border: 'border-4', text: 'text-base', gap: 'gap-4' },
};

/**
 * Reusable loading indicator: a modern dual-ring spinner 
 */
function Loader({ message = 'Loading...', size = 'md', fullScreen = false, inline = false, className = '' }) {
  const { box, border, text, gap } = SIZES[size] || SIZES.md;

  const layout = inline
    ? `inline-flex items-center ${gap}`
    : `flex flex-col items-center justify-center ${gap} ${fullScreen ? 'min-h-screen' : 'min-h-[200px]'}`;

  return (
    <div className={`${layout} ${className}`.trim()} role="status" aria-live="polite">
      <span className={`relative inline-flex ${box}`} aria-hidden="true">
        {/* faint full track */}
        <span className={`absolute inset-0 rounded-full ${border} border-blue-100`} />
        {/* spinning accent arc */}
        <span className={`absolute inset-0 rounded-full ${border} border-transparent border-t-blue-600 animate-spin`} />
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
  size: PropTypes.oneOf(['sm', 'md', 'lg']),
  fullScreen: PropTypes.bool,
  inline: PropTypes.bool,
  className: PropTypes.string,
};

export { Loader };
