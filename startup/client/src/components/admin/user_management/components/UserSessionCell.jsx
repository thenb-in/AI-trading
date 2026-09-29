import { useCallback, useState } from 'react';
import PropTypes from 'prop-types';
import { Circle } from 'lucide-react';
import { UserSessionsModal } from './UserSessionsModal';

// Three things can be true of an account, and an administrator needs them apart:
// connected right now, holding a session it can wake up with, or neither.
const state = (session) => {
  if (session?.online) {
    return {
      label: session.devices?.length > 1 ? `Online · ${session.devices.length} devices` : 'Online',
      dot: 'fill-green-500 text-green-500',
      text: 'text-green-700'
    };
  }
  if (session?.signedIn) {
    return { label: 'Signed in', dot: 'fill-amber-400 text-amber-400', text: 'text-amber-700' };
  }
  return { label: 'Offline', dot: 'fill-gray-300 text-gray-300', text: 'text-gray-500' };
};

const UserSessionCell = ({ session, userName, canSignOut = false, onSignOut, onSignOutDevice }) => {
  const [open, setOpen] = useState(false);
  const openDevices = useCallback(() => setOpen(true), []);
  const closeDevices = useCallback(() => setOpen(false), []);
  const signOutAll = useCallback(() => {
    setOpen(false);
    onSignOut?.();
  }, [onSignOut]);
  const signOutDevice = useCallback((sessionId) => onSignOutDevice?.(sessionId), [onSignOutDevice]);
  const { label, dot, text } = state(session);
  const devices = session?.devices || [];
  const hasSession = Boolean(session?.online || session?.signedIn);
  const badge = (
    <>
      <Circle className={`h-2.5 w-2.5 ${dot}`} />
      <span>{label}</span>
    </>
  );

  // Nothing to end, or not yours to end: the badge only reports.
  if (!canSignOut || !hasSession) {
    return (
      <div className={`flex items-center gap-2 px-2 py-1 text-sm ${text}`}>
        {badge}
      </div>
    );
  }

  // The row is a click target while bulk delete is on, and clicks inside the popup still bubble
  // to it through React, so nothing here lets a click reach the row.
  const stop = (event) => event.stopPropagation();

  return (
    <div onClick={stop} role="presentation">
      <button
        type="button"
        onClick={openDevices}
        title="Show this user's devices"
        className={`flex items-center gap-2 rounded px-2 py-1 text-sm transition-colors hover:bg-gray-100 ${text}`}
      >
        {badge}
      </button>

      <UserSessionsModal
        isOpen={open}
        onClose={closeDevices}
        userName={userName}
        status={<span className={`flex items-center gap-2 ${text}`}>{badge}</span>}
        devices={devices}
        onSignOutAll={signOutAll}
        onSignOutDevice={signOutDevice}
      />
    </div>
  );
};

UserSessionCell.propTypes = {
  session: PropTypes.shape({
    online: PropTypes.bool,
    signedIn: PropTypes.bool,
    devices: PropTypes.array
  }),
  userName: PropTypes.string,
  canSignOut: PropTypes.bool,
  onSignOut: PropTypes.func,
  onSignOutDevice: PropTypes.func
};

export { UserSessionCell };
