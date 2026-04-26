import { CreditCard } from 'lucide-react';
import PropTypes from 'prop-types';

function SubscriptionSelector({ subscriptions, selectedSubscriptionId, onSelect, loading }) {
  const handleChange = (e) => {
    const value = e.target.value;
    if (value === '') {
      onSelect(null);
    } else {
      onSelect(Number(value));
    }
  };

  return (
    <div className="mb-3">
      <label className="block text-xs font-medium text-gray-700 mb-1">
        Select Subscription
      </label>
      <div className="relative">
        <select
          value={selectedSubscriptionId || ''}
          onChange={handleChange}
          disabled={loading}
          className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded bg-white text-gray-900 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed appearance-none pr-8"
        >
          <option value="">-- Select a subscription --</option>
          {subscriptions.map((subscription) => {
            const subscriptionLabel = subscription.description 
              ? `${subscription.name} - ${subscription.description}`
              : subscription.name;
            const typeLabel = subscription.isGlobal 
              ? ' (Global)' 
              : ' (Company)';
            return (
              <option key={subscription.id} value={subscription.id}>
                {subscriptionLabel + typeLabel}
              </option>
            );
          })}
        </select>
        <CreditCard className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
      </div>
    </div>
  );
}

SubscriptionSelector.propTypes = {
  subscriptions: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.number.isRequired,
      name: PropTypes.string.isRequired,
      description: PropTypes.string,
    })
  ).isRequired,
  selectedSubscriptionId: PropTypes.number,
  onSelect: PropTypes.func.isRequired,
  loading: PropTypes.bool,
};

export { SubscriptionSelector };

