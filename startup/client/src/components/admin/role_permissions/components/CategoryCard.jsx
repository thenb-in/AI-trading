import { Loader2 } from 'lucide-react';
import PropTypes from 'prop-types';

/**
 * The card each permission category is drawn in, and the control that grants or
 * revokes the whole of it.
 *
 * The three categories differ only in what goes inside the card — a grid of
 * chips, a wide table, or the operation matrix — so the shell around them is
 * written once here rather than three times at each layout.
 */

/**
 * Grant or revoke every permission in the category the reader is looking at.
 * Only what the company's plan allows can be toggled, so with none of it
 * subscribed the control is dead and says why.
 */
function SelectAllButton({ onToggle, allAssigned, hasSubscribed, isRoleReadOnly, updating, disabled }) {
  return (
    <button
      onClick={onToggle}
      disabled={updating || disabled || isRoleReadOnly || !hasSubscribed}
      className="text-xs text-blue-600 hover:text-blue-800 font-medium disabled:opacity-50"
      title={
        !hasSubscribed
          ? 'No subscribed permissions available'
          : isRoleReadOnly
            ? 'Read-only: Only superadmins can modify default roles'
            : ''
      }
    >
      {updating ? (
        <Loader2 className="w-3 h-3 animate-spin inline" />
      ) : allAssigned ? (
        'Deselect All'
      ) : (
        'Select All'
      )}
    </button>
  );
}

SelectAllButton.propTypes = {
  onToggle: PropTypes.func.isRequired,
  allAssigned: PropTypes.bool,
  hasSubscribed: PropTypes.bool,
  isRoleReadOnly: PropTypes.bool,
  updating: PropTypes.bool,
  /** Set when there is no role to act on at all. */
  disabled: PropTypes.bool,
};

function CategoryCard({ icon: Icon, title, badge, colorClass, summary, toggle, children }) {
  return (
    <div className={`border rounded p-2 ${colorClass}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <Icon className="w-4 h-4 text-gray-700" />
          <h3 className="text-xs font-semibold text-gray-900">{title}</h3>
          {badge}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-600">{summary}</span>
          {toggle}
        </div>
      </div>

      {children}
    </div>
  );
}

CategoryCard.propTypes = {
  icon: PropTypes.elementType.isRequired,
  title: PropTypes.string.isRequired,
  /** Shown beside the title — the "Investigation Needed" tag, for one. */
  badge: PropTypes.node,
  colorClass: PropTypes.string,
  /** The count on the right: "12/40", or "40 permissions". */
  summary: PropTypes.node,
  /** Usually a SelectAllButton; the matrix has nothing to put here. */
  toggle: PropTypes.node,
  children: PropTypes.node,
};

export { CategoryCard, SelectAllButton };
