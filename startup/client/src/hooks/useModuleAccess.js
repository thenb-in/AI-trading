import { useCallback, useEffect, useState } from 'react';
import { ApiService } from '@services/ApiService';
import { useDataContext } from '@context/useDataContext';
import { getPermissionSubscriptionStatusByName } from '@startup/components/admin/role_permissions/utils/permissionUtils';

/**
 * `{ subscriptionStatus, isSubscribed, isHidden }` for a module, or null to say
 * "do not show this one" — a hidden permission is subscribed but advertised to
 * support staff only, so everyone else never sees the module.
 */
const resolveFor = (permissionName, companySubscriptions, userData) => {
  if (!permissionName || companySubscriptions.length === 0) {
    return { subscriptionStatus: null, isSubscribed: true, isHidden: false };
  }
  const subscriptionStatus = getPermissionSubscriptionStatusByName(companySubscriptions, permissionName);
  if (subscriptionStatus === 'hidden') {
    if (!userData?.isSupportUser) return null;
    return { subscriptionStatus, isSubscribed: true, isHidden: true };
  }
  return { subscriptionStatus, isSubscribed: subscriptionStatus === 'subscribed', isHidden: false };
};

/** Why a module cannot be opened — the plan does not carry it, or the role lacks it — or undefined when it can. */
const moduleLockReason = ({ permissionName, hasPermissionAccess, isSubscribed, isHidden }) => {
  if (!isSubscribed && !isHidden) return 'Not subscribed. Please upgrade your plan to access this module.';
  if (!hasPermissionAccess) return `Access denied. Required permission: ${permissionName}`;
  if (isHidden) return 'Hidden permission (visible to superadmins only)';
  return undefined;
};

/**
 * Whether this company's plan carries a module, for every screen that lists
 * modules (the navigator, the app guide). The company's subscriptions are read
 * once; `resolveSubscription(permissionName)` answers per module from them.
 */
const useModuleAccess = () => {
  const { userData } = useDataContext();
  const [companySubscriptions, setCompanySubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const companyId = userData?.companyId || userData?.company?.id;
    if (!companyId) {
      setCompanySubscriptions([]);
      setLoading(false);
      return undefined;
    }
    let cancelled = false;
    setLoading(true);
    ApiService.getCompanySubscriptions(companyId)
      .then((response) => {
        if (!cancelled) setCompanySubscriptions(response?.data?.data || response?.data || []);
      })
      .catch((error) => {
        console.error(`Module access: could not load subscriptions for company ${companyId}`, error);
        if (!cancelled) setCompanySubscriptions([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [userData]);

  const resolveSubscription = useCallback(
    (permissionName) => resolveFor(permissionName, companySubscriptions, userData),
    [companySubscriptions, userData],
  );

  return { resolveSubscription, loading };
};

export { moduleLockReason, useModuleAccess };
