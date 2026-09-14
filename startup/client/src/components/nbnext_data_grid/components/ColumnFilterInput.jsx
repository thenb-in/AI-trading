import { TextTypeField } from '@startup/components/base_components/fields/TextTypeField';
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import PropTypes from "prop-types";
import { ListFilter } from "lucide-react";
import { isValueLessOperator, OPERATOR_LABELS } from "@utils/masterAdvancedFilterUtils";
import {
  DEFAULT_OPERATOR,
  OPERATOR_SYMBOL,
  getColumnFilterOperators,
  normalizeFilterEntry,
} from "../utils/columnFilters";

/**
 * One column's box in the filter bar: type to narrow, and a button on the
 * right to say how.
 *
 * Typing alone still means "contains", which is what the bar has always done —
 * the operator is an escape hatch, not a step. So the button stays quiet while
 * the column is on the default and only announces itself (blue, showing the
 * operator's symbol) once it isn't, which is also the only time a reader
 * scanning the bar could be misled about what a box means.
 *
 * The menu is portalled to <body> and positioned from the button's rect: the
 * filter row is sticky inside a scrolling container, so a menu positioned
 * inside it would be clipped by the first frozen column it crossed.
 */
function ColumnFilterInput({ column, columnType, entry, onChange, onInputClick }) {
  const { operator, value } = normalizeFilterEntry(entry);
  const [menuRect, setMenuRect] = useState(null);
  const buttonRef = useRef(null);
  const operators = getColumnFilterOperators(columnType || column.type);
  const isDefault = operator === DEFAULT_OPERATOR;
  const valueless = isValueLessOperator(operator);

  const closeMenu = useCallback(() => setMenuRect(null), []);

  useEffect(() => {
    if (!menuRect) return undefined;
    const onKeyDown = (e) => {
      if (e.key === "Escape") closeMenu();
    };
    // Scrolling the grid would leave the menu behind, pointing at nothing.
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("scroll", closeMenu, true);
    window.addEventListener("resize", closeMenu);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("scroll", closeMenu, true);
      window.removeEventListener("resize", closeMenu);
    };
  }, [menuRect, closeMenu]);

  const toggleMenu = useCallback((e) => {
    e.stopPropagation();
    setMenuRect((open) => (open ? null : buttonRef.current?.getBoundingClientRect() || null));
  }, []);

  const handleValueChange = useCallback(
    (e) => onChange(column.field, { operator, value: e.target.value }),
    [onChange, column.field, operator]
  );

  const pickOperator = useCallback(
    (next) => {
      closeMenu();
      // A value-less operator keeps whatever was typed rather than discarding
      // it, so switching back to "contains" doesn't cost the user their text.
      onChange(column.field, { operator: next, value });
    },
    [closeMenu, onChange, column.field, value]
  );

  // Anchored to the button's rect, clamped so a menu opened on the last
  // column or near the bottom of the window still lands on screen.
  const menuStyle = menuRect
    ? {
        top: Math.min(menuRect.bottom + 4, window.innerHeight - 300),
        left: Math.min(menuRect.left, window.innerWidth - 200),
        minWidth: 176,
      }
    : undefined;

  return (
    <div className="relative flex items-center gap-1">
      <TextTypeField
        value={valueless ? "" : value}
        onChange={handleValueChange}
        disabled={valueless}
        placeholder={valueless ? OPERATOR_LABELS[operator] : "Filter..."}
        title={isDefault ? undefined : `${OPERATOR_LABELS[operator]}…`}
        className={`!px-2 !py-1 !text-xs !rounded ${valueless ? "italic" : ""}`}
        containerClassName="min-w-0 flex-1"
        onClick={onInputClick}
      />
      <button
        ref={buttonRef}
        type="button"
        onClick={toggleMenu}
        aria-haspopup="listbox"
        aria-expanded={Boolean(menuRect)}
        aria-label={`Filter condition for ${column.headerName || column.field}: ${OPERATOR_LABELS[operator]}`}
        title={`Condition: ${OPERATOR_LABELS[operator]}`}
        className={`shrink-0 inline-flex h-6 min-w-[24px] items-center justify-center rounded border px-1 text-[11px] font-semibold leading-none ${
          isDefault
            ? "border-gray-300 bg-white text-gray-400 hover:text-gray-700 hover:bg-gray-50"
            : "border-blue-400 bg-blue-50 text-blue-700 hover:bg-blue-100"
        }`}
      >
        {isDefault ? <ListFilter className="h-3.5 w-3.5" /> : OPERATOR_SYMBOL[operator] || "?"}
      </button>

      {menuRect
        ? createPortal(
            <>
              <div className="fixed inset-0 z-[11000]" onClick={closeMenu} />
              <div
                role="listbox"
                className="fixed z-[11001] max-h-72 overflow-y-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg"
                style={menuStyle}
              >
                {operators.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    role="option"
                    aria-selected={option.value === operator}
                    onClick={() => pickOperator(option.value)}
                    className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs ${
                      option.value === operator
                        ? "bg-blue-50 font-semibold text-blue-700"
                        : "text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    <span className="w-6 shrink-0 text-center text-[11px] text-gray-400">
                      {OPERATOR_SYMBOL[option.value]}
                    </span>
                    {option.label}
                  </button>
                ))}
              </div>
            </>,
            document.body
          )
        : null}
    </div>
  );
}

ColumnFilterInput.propTypes = {
  column: PropTypes.shape({
    field: PropTypes.string.isRequired,
    headerName: PropTypes.string,
    type: PropTypes.string,
  }).isRequired,
  /** Resolved by the grid, which can see the data; falls back to column.type. */
  columnType: PropTypes.string,
  /** `{ operator, value }`, or a bare string from a layout saved before operators. */
  entry: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
  /** (field, { operator, value }) => void */
  onChange: PropTypes.func.isRequired,
  onInputClick: PropTypes.func,
};

export { ColumnFilterInput };
