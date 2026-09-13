import { Box, IconButton, Tooltip, Typography } from '@mui/material';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import PropTypes from 'prop-types';
import { SHORTCUTS } from '@startup/constants/shortcuts';
import { shortcutTitle } from '@utils/keyboardShortcut';
import { useShortcut } from '@startup/hooks/useShortcut';

/**
 * Previous / Next arrows for a record opened from a master's grid. It lives
 * inside the dialog, so its Alt+←/→ register as dialog shortcuts and win over
 * anything on the page behind. A missing handler means there is no record that
 * way, and its arrow is disabled.
 */
const RecordNav = ({ position, total, onPrevious, onNext }) => {
  useShortcut(SHORTCUTS.PREVIOUS_RECORD, onPrevious, { enabled: Boolean(onPrevious) });
  useShortcut(SHORTCUTS.NEXT_RECORD, onNext, { enabled: Boolean(onNext) });

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
      <Tooltip title={shortcutTitle('Previous record', SHORTCUTS.PREVIOUS_RECORD)}>
        <span>
          <IconButton size="small" onClick={onPrevious} disabled={!onPrevious}>
            <ChevronLeft size={20} />
          </IconButton>
        </span>
      </Tooltip>
      <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
        {`${position} of ${total}`}
      </Typography>
      <Tooltip title={shortcutTitle('Next record', SHORTCUTS.NEXT_RECORD)}>
        <span>
          <IconButton size="small" onClick={onNext} disabled={!onNext}>
            <ChevronRight size={20} />
          </IconButton>
        </span>
      </Tooltip>
    </Box>
  );
};

RecordNav.propTypes = {
  position: PropTypes.number.isRequired,
  total: PropTypes.number.isRequired,
  onPrevious: PropTypes.func,
  onNext: PropTypes.func,
};

export { RecordNav };
