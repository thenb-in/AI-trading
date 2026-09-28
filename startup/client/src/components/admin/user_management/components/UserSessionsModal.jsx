import { useCallback } from 'react';
import PropTypes from 'prop-types';
import { LogOut, Monitor, Smartphone } from 'lucide-react';
import { BaseModal } from '@startup/components/base_components/master';
import { formatLastActive, formatRelativeTime } from '@utils/dateTimeUtils';

// A phone or tablet gets the phone icon; anything else reads as a computer.
const isMobileDevice = (label) => /android|iphone|ipad|ios|mobile/i.test(label || '');

// One signed-in device: what it is, where from, since when, and a way to end it.
const DeviceRow = ({ device, onSignOut }) => {
  const Icon = isMobileDevice(device.label) ? Smartphone : Monitor;
  const handleSignOut = useCallback(() => onSignOut(device.id), [onSignOut, device.id]);
  return (
    <li className="flex items-center gap-3 py-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-600">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-gray-900">{device.label}</p>
        <p className="truncate text-xs text-gray-500">
          {[device.ip, device.since && `Signed in ${formatLastActive(device.since)}`].filter(Boolean).join(' · ')}
        </p>
        {device.lastActive && (
          <p className="text-xs text-gray-400">Last active {formatRelativeTime(device.lastActive)}</p>
        )}
      </div>
      <button
        type="button"
        onClick={handleSignOut}
        className="flex shrink-0 items-center gap-1 rounded-md border border-red-200 px-2.5 py-1 text-xs font-medium text-red-600 transition-colors hover:bg-red-50"
      >
        <LogOut className="h-3.5 w-3.5" />
        Sign out
      </button>
    </li>
  );
};

DeviceRow.propTypes = {
  device: PropTypes.shape({
    id: PropTypes.string.isRequired,
    label: PropTypes.string,
    ip: PropTypes.string,
    since: PropTypes.string,
    lastActive: PropTypes.string
  }).isRequired,
  onSignOut: PropTypes.func.isRequired
};

// A user's signed-in devices in a popup, each with its own sign-out, and one to end them all.
const UserSessionsModal = ({ isOpen, onClose, userName, status, devices, onSignOutAll, onSignOutDevice }) => {
  const hasDevices = devices.length > 0;
  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={userName ? `Signed-in devices · ${userName}` : 'Signed-in devices'}
      maxWidth="sm"
      // Nothing listed means nothing to sign out of.
      actions={hasDevices ? (
        <button
          type="button"
          onClick={onSignOutAll}
          className="flex items-center gap-1.5 rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-red-700"
        >
          <LogOut className="h-4 w-4" />
          Sign out all devices
        </button>
      ) : undefined}
    >
      <div className="mb-1 flex items-center gap-2 text-sm">{status}</div>
      {hasDevices ? (
        <ul className="divide-y divide-gray-100">
          {devices.map((device) => (
            <DeviceRow key={device.id} device={device} onSignOut={onSignOutDevice} />
          ))}
        </ul>
      ) : (
        <p className="py-4 text-sm text-gray-500">
          No device sign-in is recorded for this user yet. Their devices show here from their next sign-in.
        </p>
      )}
    </BaseModal>
  );
};

UserSessionsModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  userName: PropTypes.string,
  /** The user's status badge (Online / Signed in), shown above the list. */
  status: PropTypes.node,
  devices: PropTypes.array.isRequired,
  /** Ends every device (goes through the confirmation dialog). */
  onSignOutAll: PropTypes.func.isRequired,
  /** Ends one device by its session id. */
  onSignOutDevice: PropTypes.func.isRequired
};

export { UserSessionsModal };
