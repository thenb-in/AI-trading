import PropTypes from 'prop-types';
import { ShieldCheck } from 'lucide-react';
import { PlanCard } from '../../PlanCard';
import { planShape } from '../../types';

/** Step 1 — plan selection grid (with loading / empty states). */
function PlanStep({ plans, plansLoading, selectedPlanId, onSelect }) {
  if (plansLoading) {
    return <p className="text-center text-gray-500 py-10">Loading plans…</p>;
  }
  if (plans.length === 0) {
    return (
      <p className="text-center text-gray-500 py-10">
        No plans are available right now. Please contact support.
      </p>
    );
  }
  return (
    <div>
      {/* SaaS-style value banner above the plans */}
      <div className="mb-6 flex flex-col gap-1 rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-50 to-indigo-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-base font-bold text-gray-900">
            One platform for attendance, payroll &amp; compliance.
          </p>
          <p className="mt-0.5 text-sm text-gray-600">
            Pick the plan that fits today — upgrade or switch anytime as your team grows.
          </p>
        </div>
        <span className="mt-2 inline-flex w-fit items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-semibold text-blue-700 shadow-sm sm:mt-0">
          <ShieldCheck className="h-3.5 w-3.5" />
          No setup fees
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5 items-stretch pt-3">
        {plans.map((plan) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            selected={plan.id === selectedPlanId}
            onSelect={onSelect}
          />
        ))}
      </div>
    </div>
  );
}

PlanStep.propTypes = {
  plans: PropTypes.arrayOf(planShape).isRequired,
  plansLoading: PropTypes.bool.isRequired,
  selectedPlanId: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  onSelect: PropTypes.func.isRequired
};

export { PlanStep };
