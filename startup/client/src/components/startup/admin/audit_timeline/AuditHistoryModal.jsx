import { Dialog, DialogTitle, DialogContent, IconButton, useMediaQuery, useTheme } from '@mui/material';
import { X } from 'lucide-react';
import PropTypes from 'prop-types';
import {AuditTimeline} from './AuditTimeline';
import { getDialogSidebarSx } from '@startup/base_components/utils/dialogSx';

const AuditHistoryModal = ({
  isOpen,
  onClose,
  head,
  objectId,
  pageSize = 25,
  maxWidth = 'md',
  fullWidth = true
}) => {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      maxWidth={maxWidth}
      fullWidth={fullWidth}
      fullScreen={fullScreen}
      sx={getDialogSidebarSx(fullScreen, 60)}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          pb: 1,
        }}
      >
        Audit History
        <IconButton onClick={onClose} size="small">
          <X size={20} />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ pt: 0 }}>
        <AuditTimeline head={head} objectId={objectId} pageSize={pageSize} />
      </DialogContent>
    </Dialog>
  );
};

AuditHistoryModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  head: PropTypes.string,
  objectId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  pageSize: PropTypes.number,
  maxWidth: PropTypes.oneOf(['xs', 'sm', 'md', 'lg', 'xl']),
  fullWidth: PropTypes.bool,
};

export { AuditHistoryModal };

