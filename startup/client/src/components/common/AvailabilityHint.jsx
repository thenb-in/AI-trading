import PropTypes from 'prop-types';
import { Loader2, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';

// status -> icon + colour + default message for a live availability check.
const VARIANTS = {
  checking: { icon: Loader2, cls: 'text-gray-400', spin: true, text: 'Checking availability…' },
  available: { icon: CheckCircle2, cls: 'text-emerald-600', text: 'Great — this is available!' },
  taken: { icon: XCircle, cls: 'text-red-600', text: 'Already taken — please choose another.' },
  error: { icon: AlertCircle, cls: 'text-amber-600', text: 'Could not check right now.' }
};

/**
 * Tiny inline feedback line shown under a field as the user types, driven by
 * useAvailabilityCheck. Generic — pass a custom `takenLabel` per field.
 */
function AvailabilityHint({ status, takenLabel }) {
  const variant = VARIANTS[status];
  if (!variant) return null;

  const { icon: Icon, cls, spin, text } = variant;
  const message = status === 'taken' && takenLabel ? takenLabel : text;

  return (
    <p className={`mt-1.5 flex items-center gap-1.5 text-xs font-medium ${cls}`}>
      <Icon size={13} className={spin ? 'animate-spin' : ''} />
      {message}
    </p>
  );
}

AvailabilityHint.propTypes = {
  status: PropTypes.oneOf(['idle', 'checking', 'available', 'taken', 'error']),
  takenLabel: PropTypes.string
};

export { AvailabilityHint };
