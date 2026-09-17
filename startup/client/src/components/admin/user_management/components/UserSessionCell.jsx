import PropTypes from 'prop-types';
import { Circle } from 'lucide-react';
import { parseDateValue } from '@utils/dateTimeUtils';

// Three things can be true of an account, and an administrator needs them apart:
// connected right now, holding a session it can wake up with, or neither.
const state = (session) => {
  if (session?.online) {
    return {
      label: session.devices.length > 1 ? `Online · ${session.devices.length} devices` : 'Online',
      dot: 'fill-green-500 text-green-500',
      text: 'text-green-700'
    };
  }
  if (session?.signedIn) {
    return { label: 'Signed in', dot: 'fill-amber-400 text-amber-400', text: 'text-amber-700' };
  }
  return { label: 'Offline', dot: 'fill-gray-300 text-gray-300', text: 'text-gray-500' };
};

// "Chrome on macOS · 10.1.2.3 · since 09:41" per live connection, so support can
// tell a forgotten tab from someone actually working.
const deviceLines = (devices = []) =>
  devices
    .map((device) => [device.label, device.ip, device.since && `since ${parseDateValue(device.since).toLocaleTimeString()}`]
      .filter(Boolean)
      .join(' · '))
    .join('\n');

const UserSessionCell = ({ session, canSignOut = false, onSignOut }) => {
  const { label, dot, text } = state(session);
  const devices = deviceLines(session?.devices);
  const badge = (
    <>
      <Circle className={`h-2.5 w-2.5 ${dot}`} />
      <span>{label}</span>
    </>
  );

  // Nothing to end, or not yours to end: the badge only reports.
  if (!canSignOut || !(session?.online || session?.signedIn)) {
    return (
      <div className={`flex items-center gap-2 px-2 py-1 text-sm ${text}`} title={devices}>
        {badge}
      </div>
    );
  }

  const signOut = (event) => {
    // The row itself is a click target while bulk delete is on.
    event.stopPropagation();
    onSignOut();
  };

  return (
    <button
      type="button"
      onClick={signOut}
      title={[devices, 'Click to sign this user out of every device'].filter(Boolean).join('\n')}
      className={`flex items-center gap-2 rounded px-2 py-1 text-sm transition-colors hover:bg-gray-100 hover:underline ${text}`}
    >
      {badge}
    </button>
  );
};

UserSessionCell.propTypes = {
  session: PropTypes.shape({
    online: PropTypes.bool,
    signedIn: PropTypes.bool,
    devices: PropTypes.array
  }),
  /** Whether this administrator may end the session — the badge is a button only then. */
  canSignOut: PropTypes.bool,
  onSignOut: PropTypes.func
};

export { UserSessionCell };
