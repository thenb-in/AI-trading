import { CheckboxTypeField } from '@startup/components/base_components/fields/CheckboxTypeField';
import PropTypes from 'prop-types';
import { Link2 } from 'lucide-react';

/**
 * The permission tables speak in symbols — ✓/✕ buttons that act on a whole row
 * or column, an em dash for "nothing here", dimmed controls for permissions you
 * cannot set — and say so only in tooltips, which you have to already suspect
 * something to go looking for. This states the vocabulary once, in the same
 * glyphs the tables use.
 *
 * Laid out as separated cells rather than a run of inline text: five
 * explanations in one flowing line is a wall, and the reader is looking for one
 * of them, not all.
 */
// Fixed width for alignment, but no box: a ✓ drawn inside a small square reads
// as a ticked checkbox, which is the exact confusion this legend exists to
// clear up. The tables draw these bare, so the legend does too.
const SYMBOL_CELL = 'flex h-5 w-5 shrink-0 items-center justify-center';

// 1px gaps over a grey backdrop draw the rules between cells, which beats
// nth-child borders when the column count changes at every breakpoint.
const GRID = 'grid grid-cols-1 gap-px overflow-hidden rounded bg-gray-200 sm:grid-cols-2 xl:grid-cols-3';
const ITEM = 'flex items-center gap-2 bg-white px-3 py-2';

const PermissionLegend = ({ isRoleReadOnly = false }) => (
  <div className="rounded-lg border border-gray-300 bg-white p-3 shadow-sm">
    <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-gray-500">
      What the symbols mean
    </p>

    <ul className={GRID}>
      <li className={ITEM}>
        <span className={`${SYMBOL_CELL} text-sm font-bold text-blue-600`}>✓</span>
        <span className="text-xs text-gray-700">
          <span className="font-medium text-gray-900">Grant all</span> in that row or column
        </span>
      </li>

      <li className={ITEM}>
        <span className={`${SYMBOL_CELL} text-sm font-bold text-blue-600`}>✕</span>
        <span className="text-xs text-gray-700">
          <span className="font-medium text-gray-900">Revoke all</span> — replaces ✓ once every one is granted
        </span>
      </li>

      <li className={ITEM}>
        <span className={`${SYMBOL_CELL} text-sm text-gray-400`}>—</span>
        <span className="text-xs text-gray-700">No such permission exists</span>
      </li>

      <li className={ITEM}>
        <span className={`${SYMBOL_CELL}`}>
          <CheckboxTypeField mode="bare" disabled readOnly className="!h-3.5 !w-3.5 opacity-50" />
        </span>
        <span className="text-xs text-gray-700">
          {isRoleReadOnly ? (
            <>
              <span className="font-medium text-gray-900">Dimmed</span> — not in your plan, or this role is read-only
            </>
          ) : (
            <>
              <span className="font-medium text-gray-900">Dimmed</span> — not in your plan, upgrade to use it
            </>
          )}
        </span>
      </li>

      <li className={ITEM}>
        <span className={`${SYMBOL_CELL}`}>
          <Link2 className="h-3.5 w-3.5 text-blue-500" />
        </span>
        <span className="text-xs text-gray-700">
          <span className="font-medium text-gray-900">Linked</span> — also toggles its module permission
        </span>
      </li>
      {/* Fills the last cell so the grid backdrop does not show as a grey
          patch; unnecessary when the list is a single column. */}
      <li aria-hidden className="hidden bg-white sm:block" />
    </ul>
  </div>
);

PermissionLegend.propTypes = {
  /** Global roles are read-only for everyone but support, which dims the same
   *  controls a missing subscription does — so the legend has to say both. */
  isRoleReadOnly: PropTypes.bool,
};

export { PermissionLegend };
