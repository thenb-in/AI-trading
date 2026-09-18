import PropTypes from 'prop-types';

/**
 * A bar filled to `percent`. The rects carry `fill-*` classes so each caller brings its own colours,
 * and `className` carries the height, width and corner rounding of wherever the bar is sitting.
 * Without a `label` the bar is taken as decorative, for a caller that already spells the figure out
 * in text beside it.
 */
const ProgressBar = ({ percent, barClass, trackClass, radius = 0, label, className }) => (
  <svg
    className={className}
    role={label ? 'img' : undefined}
    aria-label={label}
    aria-hidden={label ? undefined : 'true'}
  >
    {trackClass && <rect className={trackClass} width="100%" height="100%" rx={radius} />}
    <rect className={barClass} width={`${Math.min(100, Math.max(0, percent))}%`} height="100%" rx={radius} />
  </svg>
);

ProgressBar.propTypes = {
  percent: PropTypes.number.isRequired,
  barClass: PropTypes.string.isRequired,
  trackClass: PropTypes.string,
  radius: PropTypes.number,
  label: PropTypes.string,
  className: PropTypes.string,
};

export { ProgressBar };
