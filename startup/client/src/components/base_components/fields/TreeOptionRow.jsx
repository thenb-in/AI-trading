import { useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import { ChevronDown, ChevronRight } from 'lucide-react';

// `indeterminate` is a DOM property, not an attribute — it must be set imperatively.
function TreeCheckbox({ checked = false, indeterminate = false, onChange }) {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current) {
      ref.current.indeterminate = !checked && indeterminate;
    }
  }, [checked, indeterminate]);
  return (
    <input
      ref={ref}
      type="checkbox"
      checked={checked}
      onChange={onChange}
      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
    />
  );
}

TreeCheckbox.propTypes = {
  checked: PropTypes.bool,
  indeterminate: PropTypes.bool,
  onChange: PropTypes.func,
};

// One row in the tree dropdown: depth connectors, an optional expand chevron,
// a tri-state checkbox and the label. Selection is owned by the row click;
// the checkbox is display-only to avoid double toggles. Purely presentational.
function TreeOptionRow({
  option,
  checked,
  indeterminate,
  isCollapsed,
  isLastChild,
  showChevron,
  showConnectors,
  onSelect,
  onToggleCollapse,
}) {
  const depth = option.depth || 0;
  const isSelectedish = checked || indeterminate;

  const noop = () => {};

  return (
    <div
      onClick={onSelect}
      className={`flex items-stretch text-sm cursor-pointer mx-1 rounded-sm hover:bg-blue-50 ${
        option.hasChildren ? 'bg-gray-50' : ''
      } ${isSelectedish ? 'text-blue-700' : 'text-gray-700'}`}
    >
      {showConnectors &&
        Array.from({ length: depth }).map((_, level) => {
          const isNodeLevel = level === depth - 1;
          return (
            <span key={`connector-${option.value}-${level}`} className="relative w-5 flex-shrink-0">
              {(!isNodeLevel || !isLastChild) && (
                <span className="absolute top-0 bottom-0 left-1/2 border-l border-gray-300" />
              )}
              {isNodeLevel && isLastChild && (
                <span className="absolute top-0 left-1/2 h-1/2 border-l border-gray-300" />
              )}
              {isNodeLevel && (
                <span className="absolute top-1/2 left-1/2 right-0 border-t border-gray-300" />
              )}
            </span>
          );
        })}
      <div className="flex items-center gap-1.5 py-1.5 pr-3 pl-1 min-w-0">
        {showChevron ? (
          <button
            type="button"
            onClick={onToggleCollapse}
            className="flex items-center justify-center w-4 h-4 text-gray-500 hover:text-gray-800 rounded flex-shrink-0"
            aria-label={isCollapsed ? 'Expand' : 'Collapse'}
          >
            {isCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        ) : (
          <span className="w-4 h-4 flex-shrink-0" />
        )}
        <TreeCheckbox checked={checked} indeterminate={indeterminate} onChange={noop} />
        <span
          title={option.label}
          className={`break-words ${
            option.hasChildren ? 'font-semibold text-gray-900' : 'text-gray-600'
          } ${isSelectedish ? '!text-blue-700' : ''}`}
        >
          {option.label}
        </span>
      </div>
    </div>
  );
}

TreeOptionRow.propTypes = {
  option: PropTypes.shape({
    value: PropTypes.string.isRequired,
    label: PropTypes.string.isRequired,
    depth: PropTypes.number,
    hasChildren: PropTypes.bool,
  }).isRequired,
  checked: PropTypes.bool,
  indeterminate: PropTypes.bool,
  isCollapsed: PropTypes.bool,
  isLastChild: PropTypes.bool,
  showChevron: PropTypes.bool,
  showConnectors: PropTypes.bool,
  onSelect: PropTypes.func.isRequired,
  onToggleCollapse: PropTypes.func.isRequired,
};

export { TreeOptionRow, TreeCheckbox };
