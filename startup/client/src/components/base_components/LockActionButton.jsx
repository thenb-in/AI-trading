import PropTypes from 'prop-types';
import { Button, Tooltip } from '@mui/material';
import { Lock, LockOpen } from '@mui/icons-material';
import { fontSize } from '@startup/constants/theme';

const lockActionButtonSx = {
  textTransform: 'none',
  fontSize: fontSize.xs,
  fontWeight: 600,
  borderRadius: 1,
  py: 0.5,
  px: 1.5,
  '&.Mui-disabled': {
    opacity: 0.6
  }
};

/**
 * The one lock/unlock button for every grid that locks a row 
 */
const LockActionButton = ({
  isLocked,
  canUnlock = false,
  unlockDisabled = false,
  lockedLabel = 'Locked',
  tooltip = '',
  onLock,
  onUnlock = null,
  onLockedClick = null
}) => {
  const showUnlock = Boolean(isLocked && canUnlock && onUnlock);
  const actions = {
    lock: { label: 'Lock', color: 'primary', icon: <Lock />, disabled: false, onClick: onLock },
    locked: { label: lockedLabel, color: 'primary', icon: <Lock />, disabled: true, onClick: onLock },
    unlock: { label: 'Unlock', color: 'warning', icon: <LockOpen />, disabled: unlockDisabled, onClick: onUnlock }
  };
  const action = actions[isLocked ? (showUnlock ? 'unlock' : 'locked') : 'lock'];

  const button = (
    <span
      onClick={action.disabled ? onLockedClick : undefined}
      className={`pointer-events-auto ${action.disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
    >
      <Button
        variant="outlined"
        color={action.color}
        size="small"
        startIcon={action.icon}
        onClick={action.onClick}
        disabled={action.disabled}
        sx={lockActionButtonSx}
      >
        {action.label}
      </Button>
    </span>
  );

  if (!tooltip) {
    return button;
  }
  return (
    <Tooltip title={tooltip} arrow>
      {button}
    </Tooltip>
  );
};

LockActionButton.propTypes = {
  isLocked: PropTypes.bool.isRequired,
  canUnlock: PropTypes.bool,
  unlockDisabled: PropTypes.bool,
  lockedLabel: PropTypes.string,
  tooltip: PropTypes.string,
  onLock: PropTypes.func.isRequired,
  onUnlock: PropTypes.func,
  onLockedClick: PropTypes.func
};

export { LockActionButton };
