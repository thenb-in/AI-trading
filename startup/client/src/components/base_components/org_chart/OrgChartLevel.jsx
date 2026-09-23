import PropTypes from 'prop-types';

const CARD_WIDTH = 240;
const COLUMN_GAP = 24;
const RAIL_GUTTER = 24;
const BRANCH_HEIGHT = 96;
const BRANCH_STEM = 16;

const dealInto = (items, count) => {
  const columns = [];
  let taken = 0;
  for (let column = 0; column < count; column += 1) {
    const size = Math.ceil((items.length - taken) / (count - column));
    columns.push(items.slice(taken, taken + size));
    taken += size;
  }
  return columns;
};

const OrgChartLevel = ({ parent, childrenNodes, renderChild, childrenLabel, availableWidth = 0 }) => {
  const fits = availableWidth > 0
    ? Math.max(1, Math.floor(availableWidth / (CARD_WIDTH + RAIL_GUTTER + COLUMN_GAP)))
    : childrenNodes.length;
  const columns = dealInto(childrenNodes, Math.max(1, Math.min(fits, childrenNodes.length)));
  const stacked = columns.some((column) => column.length > 1);

  const columnWidth = stacked ? RAIL_GUTTER + CARD_WIDTH : CARD_WIDTH;
  const totalWidth = columns.length * columnWidth + (columns.length - 1) * COLUMN_GAP;
  const origin = totalWidth / 2;
  const bend = (BRANCH_STEM + BRANCH_HEIGHT) / 2;
  const branchEnd = (index) => index * (columnWidth + COLUMN_GAP) + (stacked ? 1 : CARD_WIDTH / 2);

  return (
    <div className="flex flex-col items-center">
      {parent}
      {childrenNodes.length > 0 && (
        <>
          <div className="flex flex-col items-center">
            <div className="w-0.5 h-4 bg-slate-400" />
            {childrenLabel && (
              <span className="rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-[11px] font-medium text-slate-600 shadow-sm">
                {childrenNodes.length} {childrenLabel}
              </span>
            )}
          </div>
          <svg width={totalWidth} height={BRANCH_HEIGHT} viewBox={`0 0 ${totalWidth} ${BRANCH_HEIGHT}`} className="block overflow-visible">
            {columns.map((column, index) => (
              <path
                key={column[0].id}
                d={`M ${origin} 0 V ${BRANCH_STEM} C ${origin} ${bend} ${branchEnd(index)} ${bend} ${branchEnd(index)} ${BRANCH_HEIGHT}`}
                fill="none"
                className="stroke-slate-400"
                strokeWidth="2"
                strokeLinecap="round"
              />
            ))}
          </svg>
          <div className="flex gap-6">
            {columns.map((column) => (
              <div key={column[0].id} className={stacked ? 'w-[264px]' : 'w-60'}>
                {column.map((child, row) => (
                  <div key={child.id} className={stacked ? 'relative pl-6 pb-4 last:pb-0' : ''}>
                    {stacked && (
                      <>
                        <div className="absolute left-0 top-0 h-6 w-6 rounded-bl-lg border-b-2 border-l-2 border-slate-400" />
                        {row < column.length - 1 && <div className="absolute left-0 top-6 bottom-0 w-0.5 bg-slate-400" />}
                      </>
                    )}
                    {renderChild(child)}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

OrgChartLevel.propTypes = {
  parent: PropTypes.node.isRequired,
  childrenNodes: PropTypes.array.isRequired,
  renderChild: PropTypes.func.isRequired,
  childrenLabel: PropTypes.string,
  availableWidth: PropTypes.number,
};

export { OrgChartLevel };
