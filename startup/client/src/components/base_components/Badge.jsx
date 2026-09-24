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

/** A pill of short text in a tone — a workflow status, a read-only marker. `large` for a form header, small for a list cell. */
const Badge = ({ tone = 'gray', large = false, children }) => (
  <span
    className={`inline-flex w-fit items-center gap-1 whitespace-nowrap rounded-full font-medium ${large ? 'px-3 py-1 text-sm' : 'px-2 py-0.5 text-xs'} ${BADGE_TONES[tone] ?? BADGE_TONES.gray}`}
  >
    {children}
  </span>
);

Badge.propTypes = {
  tone: PropTypes.oneOf(Object.keys(BADGE_TONES)),
  large: PropTypes.bool,
  children: PropTypes.node,
};

export { Badge };
