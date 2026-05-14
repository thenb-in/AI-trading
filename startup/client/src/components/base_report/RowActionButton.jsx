import PropTypes from 'prop-types';
import { Button, CircularProgress } from '@mui/material';
import { fontSize, colors } from '@startup/constants/theme';

/**
 * Compact action button used inside report data-grid action columns: text-only label, fixed
 * padding/font, optional in-progress spinner. Colors come from MUI palette keys
 * (`error.main`, `success.main`, ...) so callers stay in the palette.
 */
const RowActionButton = ({ label, onClick, color = 'primary.main', isProcessing = false, disabled = false }) => {
  const hover = color.replace('.main', '.dark');
  return (
    <Button
      variant="contained"
      size="small"
      onClick={onClick}
      disabled={disabled}
      sx={{
        bgcolor: color,
        '&:hover': { bgcolor: hover },
        '&:disabled': { opacity: 0.9 },
        textTransform: 'none',
        fontSize: fontSize.xs,
        fontWeight: 600,
        borderRadius: 1,
        py: 0.5,
        px: 1.5,
      }}
    >
      {isProcessing && <CircularProgress size={14} sx={{ color: colors.primary.contrastText, mr: 0.5 }} />}
      {label}
    </Button>
  );
};

RowActionButton.propTypes = {
  label: PropTypes.node.isRequired,
  onClick: PropTypes.func.isRequired,
  color: PropTypes.string,
  isProcessing: PropTypes.bool,
  disabled: PropTypes.bool,
};

export { RowActionButton };
