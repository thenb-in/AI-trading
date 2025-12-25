import { Dialog, DialogTitle, DialogContent, DialogActions, IconButton } from '@mui/material';
import { X } from 'lucide-react';
import PropTypes from 'prop-types';

const MasterModal = ({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = 'sm',
  actions,
  showCloseButton = true,
  ...props
}) => {
  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      maxWidth={maxWidth}
      fullWidth
      {...props}
    >
      {title && (
        <DialogTitle sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          pb: 1
        }}>
          {title}
          {showCloseButton && (
            <IconButton
              onClick={onClose}
              size="small"
              sx={{ ml: 1 }}
            >
              <X size={20} />
            </IconButton>
          )}
        </DialogTitle>
      )}

      <DialogContent sx={{ pt: title ? 0 : 2 }}>
        {children}
      </DialogContent>

      {actions && (
        <DialogActions sx={{ px: 3, pb: 2 }}>
          {actions}
        </DialogActions>
      )}
    </Dialog>
  );
};

MasterModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  title: PropTypes.string,
  children: PropTypes.node,
  maxWidth: PropTypes.oneOf(['xs', 'sm', 'md', 'lg', 'xl']),
  actions: PropTypes.node,
  showCloseButton: PropTypes.bool,
};

export { MasterModal };

