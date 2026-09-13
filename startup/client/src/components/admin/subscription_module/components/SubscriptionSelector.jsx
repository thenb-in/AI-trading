import PropTypes from 'prop-types';
import { SearchableDropdown } from '@startup/components/base_components/fields/SearchableDropdown';

function SubscriptionSelector({ subscriptions, selectedSubscriptionId, onSelect, loading, onCreateSubscription }) {
  const subscriptionOptions = subscriptions.map((subscription) => {
    const subscriptionLabel = subscription.description
      ? `${subscription.name} - ${subscription.description}`
      : subscription.name;
    const typeLabel = subscription.isGlobal
      ? ' (Global)'
      : ' (Company)';
    return { value: String(subscription.id), label: subscriptionLabel + typeLabel };
  });

  const handleChange = (value) => {
    onSelect(value === '' ? null : Number(value));
  };

  return (
    <div className="mb-3">
      <label className="block text-xs font-medium text-gray-700 mb-1">
        Select Subscription
      </label>
      <SearchableDropdown
        options={subscriptionOptions}
        selectedValues={selectedSubscriptionId ? String(selectedSubscriptionId) : ''}
        onChange={handleChange}
        placeholder="-- Select a subscription --"
        multiple={false}
        disabled={loading}
        loading={loading}
        optionName="Subscription"
        onCreateOption={onCreateSubscription}
      />
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
  /** Called with the typed term to open the create-subscription modal. */
  onCreateSubscription: PropTypes.func,
};

export { SubscriptionSelector };

