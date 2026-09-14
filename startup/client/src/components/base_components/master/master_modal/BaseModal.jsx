import { Box, Button, Dialog, DialogTitle, DialogContent, DialogActions, IconButton, Tooltip, useMediaQuery, useTheme } from '@mui/material';
import { History, X } from 'lucide-react';
import PropTypes from 'prop-types';
import { useEffect, useRef, useState } from 'react';
import { AuditHistoryModal } from '@startup/components/admin/audit_timeline/AuditHistoryModal';
import { getDialogSidebarSx } from '@startup/components/base_components/utils/dialogSx';
import { SHORTCUTS } from '@startup/constants/shortcuts';
import { shortcutTitle } from '@utils/keyboardShortcut';
import { useAutoFocusFirstField } from '@startup/hooks/useAutoFocusFirstField';
import { useCreatorInitialName } from './MasterModalProvider';
import { RecordNav } from './RecordNav';

const BaseModal = ({
  isOpen,
  onClose,
  title: titleProp,
  children,
  maxWidth = 'sm',
  actions,
  actionsLeft,
  showCloseButton = true,
  auditHead,
  auditObjectId,
  showAudit = true,
  auditPageSize = 25,
  disableContentScroll = false,
  // `{ position, total, onPrevious, onNext }` — arrows to step to the
  // neighbouring records of the list this one was opened from.
  recordNav,
  autoFocusFirstField = true,
  PaperProps: paperPropsFromCaller,
  sx: sxFromCaller,
  ...props
}) => {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const hasFooter = actions || actionsLeft;
  const isTitleString = typeof titleProp === 'string';
  const isTitleNode = titleProp != null && typeof titleProp === 'object' && titleProp.$$typeof != null;
  const hasTitle = isTitleString ? titleProp !== '' : (isTitleNode || Boolean(titleProp));
  const shouldShowAudit = Boolean(showAudit && auditHead && auditObjectId != null);
  const [isAuditOpen, setIsAuditOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) setIsAuditOpen(false);
  }, [isOpen]);

  const paperRef = useRef(null);
  const initialName = useCreatorInitialName();

  // Opening a modal puts the caret in its first field, ready for entry — holding
  // what a picker's "Create …" row had typed, when this is that creator.
  useAutoFocusFirstField(paperRef, { enabled: isOpen && autoFocusFirstField, fillValue: initialName });

  const ownsScroll = disableContentScroll || fullScreen;
  const mergedPaperProps = {
    ...paperPropsFromCaller,
    ref: paperRef,
    ...(disableContentScroll && {
      sx: {
        height: '90vh',
        maxHeight: '90vh',
        ...(paperPropsFromCaller?.sx || {}),
      },
    }),
  };

  const baseSidebarSx = getDialogSidebarSx(fullScreen);
  const callerSxArray = Array.isArray(sxFromCaller)
    ? sxFromCaller
    : sxFromCaller
    ? [sxFromCaller]
    : [];
  const mergedSx = [baseSidebarSx, ...callerSxArray];

  return (
    <>
      <Dialog
        open={isOpen}
        onClose={onClose}
        maxWidth={maxWidth}
        fullWidth
        fullScreen={fullScreen}
        {...props}
        sx={mergedSx}
        PaperProps={mergedPaperProps}
      >
        {hasTitle && (
          <DialogTitle sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            pb: 1,
            flexShrink: 0,
            gap: 2,
          }}>
            <Box sx={{ minWidth: 0 }}>
              {isTitleNode ? titleProp : (isTitleString ? titleProp : String(titleProp || ''))}
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
              {recordNav && <RecordNav {...recordNav} />}
              {shouldShowAudit && (
                fullScreen ? (
                  <Tooltip title="Show Audit History">
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => setIsAuditOpen(true)}
                    >
                      <History size={20} />
                    </IconButton>
                  </Tooltip>
                ) : (
                  <Button
                    size="small"
                    variant="outlined"
                    color="error"
                    onClick={() => setIsAuditOpen(true)}
                  >
                    Show Audit History
                  </Button>
                )
              )}
              {showCloseButton && (
                <Tooltip title={shortcutTitle('Close', SHORTCUTS.CANCEL)}>
                  <IconButton
                    onClick={onClose}
                    size="small"
                    sx={{ ml: 0.5 }}
                  >
                    <X size={20} />
                  </IconButton>
                </Tooltip>
              )}
            </Box>
          </DialogTitle>
        )}

        <DialogContent
          sx={{
            pt: hasTitle ? 0 : 2,
            // Fill the paper and allow shrinking below the content's height:
            // the paper hides its own overflow (getDialogSidebarSx), so this is
            // the one place a long form scrolls instead of being cut off.
            flex: 1,
            minHeight: 0,
            overflowX: 'hidden',
            maxWidth: '100%',
            ...(ownsScroll && {
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              padding: fullScreen ? 2 : 0,
            }),
          }}
        >
          {children}
        </DialogContent>

        {hasFooter && (
          <DialogActions
            sx={{
              px: 3,
              pb: 2,
              display: 'flex',
              justifyContent:
                actionsLeft && actions ? 'space-between' : actionsLeft ? 'flex-start' : 'flex-end',
              gap: 1,
              flexWrap: 'wrap',
            }}
          >
            {actionsLeft && <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>{actionsLeft}</Box>}
            {actions && <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>{actions}</Box>}
          </DialogActions>
        )}
      </Dialog>

      {shouldShowAudit && (
        <AuditHistoryModal
          isOpen={isAuditOpen}
          onClose={() => setIsAuditOpen(false)}
          head={auditHead}
          objectId={auditObjectId}
          pageSize={auditPageSize}
        />
      )}
    </>
  );
};

BaseModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  title: PropTypes.oneOfType([PropTypes.string, PropTypes.node]),
  children: PropTypes.node,
  maxWidth: PropTypes.oneOf(['xs', 'sm', 'md', 'lg', 'xl']),
  actions: PropTypes.node,
  actionsLeft: PropTypes.node,
  showCloseButton: PropTypes.bool,
  auditHead: PropTypes.string,
  auditObjectId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  showAudit: PropTypes.bool,
  auditPageSize: PropTypes.number,
  disableContentScroll: PropTypes.bool,
  recordNav: PropTypes.shape({
    position: PropTypes.number.isRequired,
    total: PropTypes.number.isRequired,
    onPrevious: PropTypes.func,
    onNext: PropTypes.func,
  }),
  autoFocusFirstField: PropTypes.bool,
  PaperProps: PropTypes.object,
  sx: PropTypes.oneOfType([PropTypes.object, PropTypes.array, PropTypes.func]),
};

export { BaseModal };

