import PropTypes from 'prop-types';
import { createPortal } from 'react-dom';
import { Box } from '@mui/material';
import { MenuActionRow } from './MenuActionRow';

// The menu is portalled to <body>, so as far as an enclosing dialog is
// concerned a click on an option landed *outside* it — and dialogs that dismiss
// on outside-mousedown would close, taking the form with them. Keep the event
// from reaching those document-level listeners at all.
const keepInsideMenu = (event) => event.stopPropagation();

/**
 * The open menu, portalled onto <body> so it sits above modals: the accept row,
 * the options (or why there are none), how many more matches typing would
 * reveal, the create row and a loading footer.
 */
function DropdownMenu({
  menuRef,
  listRef,
  sx,
  multiple,
  onKeyDown,
  hasVisibleOptions,
  hiddenCount,
  loading,
  acceptText,
  isAcceptRowActive,
  onAccept,
  createOptionText,
  isCreateRowActive,
  onCreate,
  children,
}) {
  return createPortal(
    <Box
      ref={menuRef}
      sx={sx}
      onMouseDown={keepInsideMenu}
      className="bg-white border border-gray-300 rounded shadow-lg overflow-hidden"
    >
      <div
        ref={listRef}
        role="listbox"
        aria-multiselectable={multiple}
        tabIndex={-1}
        onKeyDown={onKeyDown}
        className="flex-1 min-h-0 overflow-y-auto py-1 focus:outline-none"
      >
        {hasVisibleOptions ? children : (
          <div className="px-3 py-2 text-sm text-gray-500 text-center">
            {loading ? 'Loading options…' : 'No options found'}
          </div>
        )}

        {hiddenCount > 0 && (
          <div className="px-3 py-2 text-xs text-gray-500 text-center border-t border-gray-100">
            {`${hiddenCount.toLocaleString()} more — keep typing to narrow`}
          </div>
        )}

        {acceptText && (
          <MenuActionRow isActive={isAcceptRowActive} onClick={onAccept} className="border-t border-gray-100">
            Accept &quot;{acceptText}&quot;
          </MenuActionRow>
        )}

        {createOptionText && (
          <MenuActionRow isActive={isCreateRowActive} onClick={onCreate} className="border-t border-gray-100">
            + {createOptionText}
          </MenuActionRow>
        )}

        {/* A list that is loading but already has rows (the "All X" placeholder,
            or a stale list being refreshed) can't use the empty-state message,
            so it gets a footer instead — otherwise the menu looks complete
            while more is coming. */}
        {loading && hasVisibleOptions && (
          <div className="px-3 py-2 text-xs text-gray-500 text-center border-t border-gray-100">
            Loading options…
          </div>
        )}
      </div>
    </Box>,
    document.body
  );
}

const refPropType = PropTypes.shape({ current: PropTypes.any });

DropdownMenu.propTypes = {
  menuRef: refPropType.isRequired,
  listRef: refPropType.isRequired,
  sx: PropTypes.object.isRequired,
  multiple: PropTypes.bool.isRequired,
  /** Only when there is no search box to hold focus and take the keys. */
  onKeyDown: PropTypes.func,
  hasVisibleOptions: PropTypes.bool.isRequired,
  // Matches left out by the row cap.
  hiddenCount: PropTypes.number.isRequired,
  loading: PropTypes.bool.isRequired,
  acceptText: PropTypes.string.isRequired,
  isAcceptRowActive: PropTypes.bool.isRequired,
  onAccept: PropTypes.func.isRequired,
  createOptionText: PropTypes.node,
  isCreateRowActive: PropTypes.bool.isRequired,
  onCreate: PropTypes.func.isRequired,
  children: PropTypes.node.isRequired,
};

export { DropdownMenu };
