/**
 * Returns MUI Dialog sx props that account for the app sidebar width.
 * @param {boolean} fullScreen - Whether the dialog is in fullScreen mode
 * @param {number} zIndex - The z-index for the dialog (default 50)
 */
function getDialogSidebarSx(fullScreen, zIndex = 50) {
  return {
    zIndex,
    '& .MuiBackdrop-root': {
      left: 'var(--app-sidebar-width, 0)',
      width: 'calc(100% - var(--app-sidebar-width, 0))',
    },
    '& .MuiDialog-container': {
      alignItems: fullScreen ? 'stretch' : 'center',
      marginLeft: 'var(--app-sidebar-width, 0)',
      width: 'calc(100% - var(--app-sidebar-width, 0))',
      maxWidth: 'calc(100% - var(--app-sidebar-width, 0))',
    },
    // The dialog's own paper only — `.MuiPaper-root` would also reach every
    // card, accordion and inline menu inside the form. Hidden overflow leaves
    // DialogContent as the one scroller, so title and actions stay put and a
    // long form never shows two scrollbars.
    '& .MuiDialog-paper': {
      overflow: 'hidden',
      maxHeight: fullScreen ? '100%' : '90vh',
      ...(fullScreen && { height: '100dvh', maxHeight: '100dvh' }),
    },
  };
}

export { getDialogSidebarSx };
