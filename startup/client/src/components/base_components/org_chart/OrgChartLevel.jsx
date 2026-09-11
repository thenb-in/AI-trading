import { useRef, useState, useEffect, Fragment } from 'react';
import PropTypes from 'prop-types';


const CARD_WIDTH = 240;
const CARD_GAP = 24;
const MAX_COLUMNS = 6;

const chunk = (items, size) => {
  const rows = [];
  for (let index = 0; index < items.length; index += size) {
    rows.push(items.slice(index, index + size));
  }
  return rows;
};

const OrgChartLevel = ({ parent, childrenNodes, renderChild, childrenLabel, nested = false }) => {
  const wrapRef = useRef(null);
  const [measured, setMeasured] = useState(MAX_COLUMNS);
  const columns = Math.max(1, Math.min(MAX_COLUMNS, nested ? childrenNodes.length : measured));

  useEffect(() => {
    const element = wrapRef.current;
    if (!element || nested || typeof ResizeObserver === 'undefined') {
      return undefined;
    }
    const observer = new ResizeObserver(([entry]) => {
      const fits = Math.floor(entry.contentRect.width / (CARD_WIDTH + CARD_GAP));
      setMeasured(fits);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [nested]);

  const rows = chunk(childrenNodes, columns);

  const renderRow = (row, rowIndex) => (
    <Fragment key={`row-${rowIndex}`}>
      {rowIndex > 0 && <div className="w-0.5 h-8 bg-slate-800" />}
      <div className="relative inline-flex gap-6 pt-8">
        <div className="absolute top-0 left-[120px] right-[120px] h-0.5 bg-slate-800" />
        {row.map((child) => (
          <div key={child.id} className="relative flex flex-col items-center">
            <div className="absolute -top-8 w-0.5 h-8 bg-slate-800" />
            {renderChild(child)}
          </div>
        ))}
      </div>
    </Fragment>
  );

  return (
    <div ref={wrapRef} className={`flex flex-col items-center ${nested ? '' : 'w-full'}`}>
      {parent}
      {childrenNodes.length > 0 && (
        <div className="flex flex-col items-center">
          <div className="w-0.5 h-4 bg-slate-800" />
          {childrenLabel && (
            <span className="rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-[11px] font-medium text-slate-600 shadow-sm">
              {childrenNodes.length} {childrenLabel}
            </span>
          )}
          <div className="w-0.5 h-4 bg-slate-800" />
        </div>
      )}
      {rows.map(renderRow)}
    </div>
  );
};

OrgChartLevel.propTypes = {
  parent: PropTypes.node.isRequired,
  childrenNodes: PropTypes.array.isRequired,
  renderChild: PropTypes.func.isRequired,
  childrenLabel: PropTypes.string,
  nested: PropTypes.bool,
};

export { OrgChartLevel };
