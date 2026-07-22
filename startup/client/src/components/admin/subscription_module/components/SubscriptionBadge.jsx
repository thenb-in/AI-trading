import PropTypes from 'prop-types';
import { CreditCard, Globe, Building2 } from 'lucide-react';


function SubscriptionBadge({ subscription, isSupportUser }) {
  if (subscription.isGlobal) {
    return (
      <>
        <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-50 text-purple-700 rounded">
          <Globe className="w-3 h-3" />
          Global Subscription
        </span>
        {!isSupportUser && (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-orange-50 text-orange-700 rounded border border-orange-200">
            <CreditCard className="w-3 h-3" />
            Read-Only (Default Subscriptions)
          </span>
        )}
      </>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded">
      <Building2 className="w-3 h-3" />
      Company-Specific Subscription
    </span>
  );
}

SubscriptionBadge.propTypes = {
  subscription: PropTypes.object.isRequired,
  isSupportUser: PropTypes.bool,
};

export { SubscriptionBadge };
