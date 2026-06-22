import { useState } from 'react';
import PropTypes from 'prop-types';
import { Check, Sparkles, ArrowRight } from 'lucide-react';
import { groupFeatures, styleFor } from './planFeatures';
import { PlanFeaturesModal } from './PlanFeaturesModal';
import { formatPrice } from './utils';
import { planShape } from './types';

/**
 * Selectable subscription card. Shows the plan name + description, a clean
 * icon-led breakdown of what's included (one row per feature group) and a clear
 * select CTA. The full feature list opens in a modal. An optional `isPopular`
 * flag on the plan highlights it as the recommended choice.
 */
function PlanCard({ plan, selected, onSelect }) {
  const [showAll, setShowAll] = useState(false);
  const groups = groupFeatures(plan.features);
  const totalFeatures = plan.features.length;
  const popular = Boolean(plan.isPopular);

  const price = formatPrice(plan.amount, plan.currency);
  const select = () => onSelect(plan.id);
  const openFeatures = (event) => {
    event.stopPropagation();
    setShowAll(true);
  };
  const closeFeatures = () => setShowAll(false);
  const handleClick = (event) => {
    // Stop the click reaching the content background, which deselects.
    event.stopPropagation();
    select();
  };
  const handleKeyDown = (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      select();
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={`group relative flex h-full cursor-pointer flex-col rounded-2xl border bg-white p-5 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500/40 ${
        selected
          ? 'border-blue-600 shadow-lg shadow-blue-600/10 ring-1 ring-blue-600'
          : 'border-gray-200 shadow-sm hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-lg'
      }`}
    >
      {popular && (
        <span className="absolute -top-3 right-5 inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-white shadow-md">
          <Sparkles className="h-3 w-3" />
          Most popular
        </span>
      )}

      {/* Header: name + description + selection check */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-lg font-bold text-gray-900">{plan.name}</h3>
          {plan.description && (
            <p className="mt-1 text-sm italic leading-relaxed text-gray-500">{plan.description}</p>
          )}
        </div>
        <span
          className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition ${
            selected
              ? 'border-blue-600 bg-blue-600 text-white'
              : 'border-gray-300 text-transparent group-hover:border-blue-400'
          }`}
        >
          <Check className="h-3.5 w-3.5" strokeWidth={3} />
        </span>
      </div>

      {/* Price — fixed annual amount from the server */}
      {price && (
        <div className="mt-4 flex items-baseline gap-1.5">
          <span className="text-3xl font-extrabold tracking-tight text-gray-900">{price}</span>
          <span className="text-sm font-medium text-gray-500">/year</span>
        </div>
      )}

      {/* Feature breakdown — one icon-led row per group */}
      <ul className="mt-5 space-y-2.5">
        {groups.map(({ group, items }) => {
          const { icon: Icon, badge } = styleFor(group);
          return (
            <li key={group} className="flex items-center gap-2.5 text-sm text-gray-600">
              <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${badge}`}>
                <Icon className="h-4 w-4" />
              </span>
              <span>
                <span className="font-semibold text-gray-900">{items.length}</span> {group}
              </span>
            </li>
          );
        })}
      </ul>

      {/* Bottom block pinned with mt-auto so the CTA aligns across cards of
          differing heights. "View all" opens the navigator modal and is kept
          out of the card's select action so it doesn't also pick the plan. */}
      <div className="mt-auto pt-4">
        <button
          type="button"
          onClick={openFeatures}
          className="inline-flex items-center gap-1 self-start text-sm font-semibold text-blue-600 hover:text-blue-700"
        >
          View all {totalFeatures} features
          <ArrowRight size={14} />
        </button>

        <div
          className={`mt-4 rounded-xl px-4 py-2.5 text-center text-sm font-semibold transition ${
            selected
              ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30'
              : 'bg-gray-100 text-gray-700 group-hover:bg-blue-50 group-hover:text-blue-700'
          }`}
        >
          {selected ? 'Selected' : 'Choose this plan'}
        </div>
      </div>

      <PlanFeaturesModal isOpen={showAll} onClose={closeFeatures} plan={plan} />
    </div>
  );
}

PlanCard.propTypes = {
  plan: planShape.isRequired,
  selected: PropTypes.bool,
  onSelect: PropTypes.func.isRequired
};

export { PlanCard };
