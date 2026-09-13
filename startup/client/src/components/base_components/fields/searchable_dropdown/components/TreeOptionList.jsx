import PropTypes from 'prop-types';
import { getCheckboxState } from '@utils/treeSelect';
import { ignoreCheckboxChange } from '../utils/menuRows';
import { TreeCheckbox } from './TreeCheckbox';
import { TreeOptionRow } from './TreeOptionRow';

/**
 * Options that describe a hierarchy. "All" sits apart above the tree as a
 * global toggle; searching hides it, along with the chevrons and connectors,
 * since matches no longer read as a tree.
 */
function TreeOptionList({
  nodes,
  allOption,
  selectedSet,
  activeIndex,
  collapsed,
  lastChildSet,
  isSearching,
  onSelect,
  onToggleCollapse,
}) {
  const showAll = !isSearching && allOption !== null;
  // The "All" row occupies index 0 when it renders.
  const treeOffset = showAll ? 1 : 0;
  const isAllSelected = showAll && selectedSet.has(allOption.value);

  return (
    <>
      {showAll && (
        <>
          <div
            role="option"
            aria-selected={isAllSelected}
            data-active={activeIndex === 0}
            onClick={() => onSelect(allOption)}
            className={`flex items-center gap-2 px-3 py-2 text-sm cursor-pointer mx-1 rounded-sm hover:bg-blue-50 ${
              isAllSelected ? 'text-blue-700 font-semibold' : 'text-gray-700 font-medium'
            } ${activeIndex === 0 ? 'ring-1 ring-inset ring-blue-400 bg-blue-50' : ''}`}
          >
            <TreeCheckbox checked={isAllSelected} indeterminate={false} onChange={ignoreCheckboxChange} />
            <span>{allOption.label}</span>
          </div>
          <div className="my-1 border-t border-gray-100" />
        </>
      )}
      {nodes.map((option, index) => {
        const { checked, indeterminate } = getCheckboxState(option, selectedSet);
        return (
          <TreeOptionRow
            key={option.value}
            option={option}
            checked={checked}
            indeterminate={indeterminate}
            isActive={index + treeOffset === activeIndex}
            isCollapsed={collapsed.has(option.value)}
            isLastChild={lastChildSet.has(option.value)}
            showChevron={option.hasChildren && !isSearching}
            showConnectors={(option.depth || 0) > 0 && !isSearching}
            onSelect={() => onSelect(option)}
            onToggleCollapse={(e) => onToggleCollapse(option.value, e)}
          />
        );
      })}
    </>
  );
}

TreeOptionList.propTypes = {
  nodes: PropTypes.arrayOf(PropTypes.shape({
    value: PropTypes.string.isRequired,
    label: PropTypes.string.isRequired,
    depth: PropTypes.number,
    hasChildren: PropTypes.bool,
  })).isRequired,
  /** The default ("All") option, or null when the options carry none. */
  allOption: PropTypes.shape({
    value: PropTypes.string.isRequired,
    label: PropTypes.string.isRequired,
  }),
  selectedSet: PropTypes.instanceOf(Set).isRequired,
  activeIndex: PropTypes.number.isRequired,
  collapsed: PropTypes.instanceOf(Set).isRequired,
  lastChildSet: PropTypes.instanceOf(Set).isRequired,
  isSearching: PropTypes.bool.isRequired,
  /** (option) */
  onSelect: PropTypes.func.isRequired,
  /** (value, event) */
  onToggleCollapse: PropTypes.func.isRequired,
};

export { TreeOptionList };
