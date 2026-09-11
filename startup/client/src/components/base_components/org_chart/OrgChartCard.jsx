import PropTypes from 'prop-types';
import { ChevronRight } from 'lucide-react';

const STATUS_TONES = {
  good: 'text-emerald-700 bg-emerald-50 ring-emerald-600/20',
  warn: 'text-amber-800 bg-amber-50 ring-amber-600/25',
  bad: 'text-rose-700 bg-rose-50 ring-rose-600/20',
  neutral: 'text-slate-600 bg-slate-100 ring-slate-500/20',
};

const ACCENTS = {
  root: 'border-l-slate-800',
  good: 'border-l-emerald-500',
  warn: 'border-l-amber-500',
  bad: 'border-l-rose-500',
  branch: 'border-l-blue-500',
  neutral: 'border-l-slate-300',
};

const ICON_TONES = {
  root: 'text-slate-700',
  good: 'text-emerald-600',
  warn: 'text-amber-600',
  bad: 'text-rose-600',
  branch: 'text-blue-600',
  neutral: 'text-slate-400',
};

const ACTION_TONES = {
  primary: 'text-blue-600 hover:bg-blue-50',
  danger: 'text-rose-600 hover:bg-rose-50',
  neutral: 'text-slate-500 hover:bg-slate-100',
};

const OrgChartCard = ({ node, expanded = false, openable = false, onSelect }) => {
  const ghost = node.variant === 'ghost';
  const wide = expanded && Boolean(node.detail);

  const renderAction = (action) => {
    const handleClick = (e) => {
      e.stopPropagation();
      action.onClick(node);
    };
    return (
      <button
        key={action.id}
        type="button"
        title={action.title}
        aria-label={action.title}
        onClick={handleClick}
        className={`p-1 rounded transition-colors ${ACTION_TONES[action.tone] || ACTION_TONES.neutral}`}
      >
        <action.icon className="w-4 h-4" />
      </button>
    );
  };

  return (
    <div
      onClick={onSelect}
      className={`group inline-block rounded-lg border border-slate-200 border-l-4 bg-white text-left transition-all
        ${expanded
          ? `${wide ? 'w-[34rem] px-5 py-4' : 'w-80 px-4 py-3'} shadow-md ring-1 ring-slate-900/5`
          : 'relative w-60 px-3.5 py-2.5 shadow-sm hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-lg hover:shadow-slate-900/10'}
        ${onSelect ? 'cursor-pointer' : ''}
        ${ghost
          ? 'border-dashed border-slate-300 border-l-slate-300 bg-slate-50'
          : (ACCENTS[node.tone] || ACCENTS.neutral)}`}
    >
      <div className={wide ? 'flex items-start gap-5' : ''}>
        <div className={wide ? 'min-w-0 flex-1' : ''}>
          <div className="flex items-start gap-2">
            {node.icon && (
              <node.icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${ghost ? 'text-slate-400' : (ICON_TONES[node.tone] || ICON_TONES.neutral)}`} />
            )}
            <div className="min-w-0 flex-1">
              <div className={`truncate font-semibold text-slate-900 ${expanded ? 'text-base' : 'text-sm'}`} title={node.title}>
                {node.title}
              </div>
              {node.subtitle && (
                <div className="truncate text-[11px] text-slate-500">{node.subtitle}</div>
              )}
            </div>
            {openable && !expanded && (
              <ChevronRight className="w-4 h-4 flex-shrink-0 text-slate-300 transition-colors group-hover:text-slate-500" />
            )}
          </div>

          {(node.stat || node.status) && (
            <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
              {node.stat && <span className="text-xs text-slate-600">{node.stat}</span>}
              {node.status && (
                <span className={`inline-flex items-center rounded px-1.5 py-px text-[11px] font-medium ring-1 ring-inset
                  ${STATUS_TONES[node.status.tone] || STATUS_TONES.neutral}`}>
                  {node.status.label}
                </span>
              )}
            </div>
          )}

          {expanded && node.meta && <div className="mt-1.5 text-[11px] text-slate-500">{node.meta}</div>}

          {expanded && node.actions?.length > 0 && (
            <div className="mt-2.5 flex items-center gap-1 border-t border-slate-100 pt-2">
              {node.actions.map(renderAction)}
            </div>
          )}
        </div>

        {wide && (
          <div className="w-1/2 flex-shrink-0 border-l border-slate-100 pl-5">{node.detail}</div>
        )}
      </div>

      {!expanded && node.actions?.length > 0 && (
        <div className="absolute right-1 top-1 flex items-center gap-0.5 rounded-md border border-slate-200 bg-white px-0.5 opacity-0 shadow-sm transition-opacity group-hover:opacity-100 focus-within:opacity-100">
          {node.actions.map(renderAction)}
        </div>
      )}
    </div>
  );
};

OrgChartCard.propTypes = {
  node: PropTypes.object.isRequired,
  expanded: PropTypes.bool,
  openable: PropTypes.bool,
  onSelect: PropTypes.func,
};

export { OrgChartCard };
