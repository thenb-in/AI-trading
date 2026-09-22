import { Box, Button, Dialog, DialogTitle, DialogContent, DialogActions, IconButton, Tooltip, useMediaQuery, useTheme } from '@mui/material';
import { History, X } from 'lucide-react';
import PropTypes from 'prop-types';
import { createContext, useContext, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { AuditHistoryModal } from '@startup/components/admin/audit_timeline/AuditHistoryModal';
import { RecordCommentsPanel } from '@startup/components/base_components/record_comments';
import { RecordAttachmentsContext } from '@startup/components/base_components/record_comments/recordAttachments';
import { getDialogSidebarSx } from '@startup/components/base_components/utils/dialogSx';
import { SHORTCUTS } from '@startup/constants/shortcuts';
import { shortcutTitle } from '@utils/keyboardShortcut';
import { useAutoFocusFirstField } from '@startup/hooks/useAutoFocusFirstField';
import { recordIdentifier } from '@startup/data/masterIdentifierRegistry';
import { useCreatorInitialName } from './MasterModalProvider';
import { RecordNav } from './RecordNav';

/**
 * A record's modal title: "Add Purchase Order" while it is new, "Edit PO-0012"
 * while this user can edit it, and just "PO-0012" when it opens read-only — the
 * record's identifier (masterIdentifierRegistry), or the master's name until
 * the record has one. Every form modal is titled this way; a `title` given to
 * the modal is only for the exception.
 */
const recordTitle = ({ masterName, record, isNew, isEditable }) => {
  if (isNew) return `Add ${masterName}`;
  const name = recordIdentifier(masterName, record) || masterName;
  return isEditable ? `Edit ${name}` : name;
};

// Lets a form rendered inside a modal title it (useModalTitle).
const ModalTitleContext = createContext(null);

/** Titles the modal this form sits in, unless that modal was given a `title` of its own. */
const useModalTitle = (title) => {
  const setTitle = useContext(ModalTitleContext);
  useLayoutEffect(() => {
    setTitle(title);
    return () => setTitle('');
  }, [setTitle, title]);
};

const BaseModal = ({
  isOpen,
  onClose,
  title: titleProp,
  children,
  maxWidth = 'sm',
  actions,
  actionsLeft,
  showCloseButton = true,
  // What this modal's record is, and which one. A FormModal has both already —
  // the master it belongs to and the record it opened — so naming a record is
  // not something any caller has to remember to do.
  recordName,
  recordId,
  // The name the activity trail files this master's changes under. The wallet
  // prices and caps heads by it, so it is a key agreed with the outside, not a
  // name for the record — only masters whose routes log activity have one.
  auditHead,
  showAudit = true,
  auditPageSize = 25,
  disableContentScroll = false,
  // `{ position, total, onPrevious, onNext }` — arrows to step to the
  // neighbouring records of the list this one was opened from.
  recordNav,
  autoFocusFirstField = true,
  // A modal opened from inside another one (the audit history, the comments)
  // has to sit above it. 50 is a modal over the page; 60 is a modal over a modal.
  zIndex = 50,
  PaperProps: paperPropsFromCaller,
  sx: sxFromCaller,
  ...props
}) => {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const hasFooter = actions || actionsLeft;
  const [formTitle, setFormTitle] = useState('');
  const title = titleProp ?? formTitle;
  const isTitleString = typeof title === 'string';
  const isTitleNode = title != null && typeof title === 'object' && title.$$typeof != null;
  const hasTitle = isTitleString ? title !== '' : (isTitleNode || Boolean(title));
  const shouldShowAudit = Boolean(showAudit && auditHead && recordId != null);
  const [isAuditOpen, setIsAuditOpen] = useState(false);
  // Anything saved can be talked about and filed against. A record still being
  // created has no id yet, so it shows the panel only where its form holds files
  // until the save (attachBeforeSave), and not when the form draws them itself.
  const attachments = useContext(RecordAttachmentsContext);
  const shouldShowComments = Boolean(recordName)
    && (recordId != null || Boolean(attachments?.attachBeforeSave && !attachments.isDrawnByForm));

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

  const baseSidebarSx = getDialogSidebarSx(fullScreen, zIndex);
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
              {isTitleNode || isTitleString ? title : String(title || '')}
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
          data-tour="master-form"
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
          <ModalTitleContext.Provider value={setFormTitle}>{children}</ModalTitleContext.Provider>

          {/* Part of the record rather than a panel beside it: what people have
              said about it, and its files at the very end, so one scroll runs
              from the first field to the last attachment. */}
          {shouldShowComments && (
            <Box sx={{
              flexShrink: 0,
              mt: 3,
              mx: fullScreen ? -2 : -3,
              mb: fullScreen ? -2 : '-20px',
              px: fullScreen ? 2 : 3,
              py: 2,
              borderTop: 1,
              borderColor: 'divider',
              bgcolor: 'grey.50',
            }}>
              <RecordCommentsPanel objectName={recordName} objectId={recordId} />
            </Box>
          )}
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
          objectId={recordId}
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
  recordName: PropTypes.string,
  recordId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  auditHead: PropTypes.string,
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
  /** 50 for a modal over the page, 60 for one opened from inside another modal. */
  zIndex: PropTypes.number,
  PaperProps: PropTypes.object,
  sx: PropTypes.oneOfType([PropTypes.object, PropTypes.array, PropTypes.func]),
};

export { BaseModal, recordTitle, useModalTitle };

