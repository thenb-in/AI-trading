import PropTypes from 'prop-types';
import { ShieldCheck, Building2, User, Lock, MapPin, Users, Check, Phone } from 'lucide-react';
import { groupFeatures, styleFor } from '../../planFeatures';
import { formatPrice } from '../../utils';
import { companyShape, accountShape, planShape } from '../../types';

const Row = ({ icon: Icon, label, value }) => (
  <div className="flex items-center justify-between px-5 py-4">
    <span className="flex items-center gap-2.5 text-sm text-gray-500">
      <Icon className="h-4 w-4 text-gray-400" />
      {label}
    </span>
    <span className="font-semibold text-gray-900">{value || '—'}</span>
  </div>
);

Row.propTypes = {
  icon: PropTypes.elementType.isRequired,
  label: PropTypes.string.isRequired,
  value: PropTypes.node
};

/** Step 4 — review summary + what's included before the Razorpay payment. */
function ReviewStep({ selectedPlan, company, account }) {
  const featureCount = selectedPlan?.features?.length;
  const groups = groupFeatures(selectedPlan?.features || []);
  const price = formatPrice(selectedPlan?.amount, selectedPlan?.currency);

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {/* Left — workspace summary */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="flex items-start justify-between gap-3 bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-4 text-white">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-blue-100">Your plan</p>
            <p className="text-lg font-bold">{selectedPlan?.name || '—'}</p>
          </div>
          {featureCount != null && (
            <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">
              {featureCount} features
            </span>
          )}
        </div>

        <div className="divide-y divide-gray-100">
          <Row icon={Building2} label="Company" value={company.name} />
          {company.state && <Row icon={MapPin} label="State" value={company.state} />}
          {company.employeeCount && (
            <Row icon={Users} label="Team size" value={company.employeeCount} />
          )}
          <Row icon={User} label="Admin name" value={account.name} />
          {account.phone && <Row icon={Phone} label="Phone" value={account.phone} />}
          <Row icon={Lock} label="Username" value={account.username} />
        </div>

        {/* Amount payable — the fixed annual price, shown before checkout */}
        {price && (
          <div className="flex items-center justify-between border-t border-gray-100 bg-gray-50 px-5 py-4">
            <span className="text-sm font-semibold text-gray-700">Amount payable</span>
            <span className="text-xl font-bold text-gray-900">
              {price} <span className="text-xs font-medium text-gray-500">per year</span>
            </span>
          </div>
        )}
      </div>

      {/* Right — what's included + security note */}
      <div className="flex flex-col gap-4">
        <div className="flex-1 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-gray-900">
            <Check className="h-4 w-4 text-emerald-600" strokeWidth={3} />
            What&apos;s included
          </h3>
          <ul className="mt-4 space-y-3">
            {groups.map(({ group, items }) => {
              const { icon: Icon, badge } = styleFor(group);
              return (
                <li key={group} className="flex items-center gap-3 text-sm text-gray-600">
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${badge}`}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <span>
                    <span className="font-semibold text-gray-900">{items.length}</span> {group}
                  </span>
                </li>
              );
            })}
            {groups.length === 0 && <li className="text-sm text-gray-400">No features listed.</li>}
          </ul>
        </div>

        <div className="flex items-start gap-2.5 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
          <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-600" />
          <span>
            <span className="font-semibold text-gray-800">Secure checkout powered by Razorpay.</span>{' '}
            Your payment is encrypted end-to-end and your Payment details are never stored on our
            servers.
          </span>
        </div>
      </div>
    </div>
  );
}

ReviewStep.propTypes = {
  selectedPlan: planShape,
  company: companyShape.isRequired,
  account: accountShape.isRequired
};

export { ReviewStep };
