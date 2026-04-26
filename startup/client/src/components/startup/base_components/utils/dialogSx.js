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
    '& .MuiPaper-root': {
      maxHeight: fullScreen ? '100%' : '90vh',
      ...(fullScreen && { height: '100dvh', maxHeight: '100dvh' }),
    },
  };
}

export { getDialogSidebarSx };
