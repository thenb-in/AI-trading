import PropTypes from 'prop-types';
import { shortcutLabel } from '@utils/keyboardShortcut';

/**
 * The keyboard shortcut badge shown inside a button — "⌘S" on a Mac,
 * "Ctrl+S" on Windows/Linux. Hidden below `md` because a touch device has no
 * keyboard to press it with.
 */
const ShortcutHint = ({ shortcut, className = '' }) => {
  const label = shortcutLabel(shortcut);
  if (!label) return null;

  return (
    <kbd
      aria-hidden
      className={`hidden md:inline-flex items-center ml-2 px-1.5 py-0.5 rounded border border-current text-[10px] font-semibold leading-none opacity-60 ${className}`}
    >
      {label}
    </kbd>
  );
};

ShortcutHint.propTypes = {
  shortcut: PropTypes.object,
  className: PropTypes.string,
};

export { ShortcutHint };
