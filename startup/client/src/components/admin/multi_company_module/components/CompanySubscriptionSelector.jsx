import { useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import { Check, ChevronDown, Loader2 } from 'lucide-react';
import { ApiService } from '@services/ApiService';
import { toast } from 'react-toastify';

function CompanySubscriptionSelector({
  companyId,
  availableSubscriptions = [],
  ensureAvailableSubscriptions,
  getCompanySubscriptionIds,
  setCompanySubscriptionIds,
  invalidateCompany,
  onUpdate,
}) {
  const [selectedSubscriptions, setSelectedSubscriptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [resolvedAvailable, setResolvedAvailable] = useState(availableSubscriptions);

  const loadSubscriptions = useCallback(async () => {
    if (!companyId) return;

    setLoading(true);
    try {
      const [available, selectedIds] = await Promise.all([
        ensureAvailableSubscriptions?.() ?? Promise.resolve(availableSubscriptions),
        getCompanySubscriptionIds(companyId),
      ]);
      if (available?.length) {
        setResolvedAvailable(available);
      }
      setSelectedSubscriptions(selectedIds);
      setHasLoaded(true);
    } catch (error) {
      toast.error(error?.message || 'Failed to load subscriptions');
    } finally {
      setLoading(false);
    }
  }, [
    companyId,
    availableSubscriptions,
    ensureAvailableSubscriptions,
    getCompanySubscriptionIds,
  ]);

  const handleOpen = useCallback(async () => {
    const nextOpen = !isOpen;
    setIsOpen(nextOpen);
    if (nextOpen && !hasLoaded) {
      await loadSubscriptions();
    }
  }, [isOpen, hasLoaded, loadSubscriptions]);

  const handleToggleSubscription = useCallback((subscriptionId) => {
    // Pending subscriptions go for approval — never let them be selected.
    const sub = (resolvedAvailable.length ? resolvedAvailable : availableSubscriptions)
      .find((s) => s.id === subscriptionId);
    if (sub?.status === 'pending') return;
    setSelectedSubscriptions((prev) => {
      if (prev.includes(subscriptionId)) {
        return prev.filter((id) => id !== subscriptionId);
      }
      return [...prev, subscriptionId];
    });
  }, [resolvedAvailable, availableSubscriptions]);

  const handleSave = useCallback(async () => {
    if (!companyId) return;

    setSaving(true);
    try {
      await ApiService.setCompanySubscriptions(companyId, selectedSubscriptions);
      setCompanySubscriptionIds(companyId, selectedSubscriptions);
      toast.success('Subscriptions updated successfully');
      setIsOpen(false);
      onUpdate?.();
    } catch (error) {
      toast.error(error?.message || 'Failed to save subscriptions');
    } finally {
      setSaving(false);
    }
  }, [companyId, selectedSubscriptions, setCompanySubscriptionIds, onUpdate]);

  const handleCancel = useCallback(() => {
    setIsOpen(false);
    invalidateCompany(companyId);
    setHasLoaded(false);
  }, [companyId, invalidateCompany]);

  const subsList = resolvedAvailable.length ? resolvedAvailable : availableSubscriptions;
  const selectedCount = selectedSubscriptions.length;
  const selectedNames = subsList
    .filter((s) => selectedSubscriptions.includes(s.id))
    .map((s) => s.name)
    .join(', ');

  return (
    <SubscriptionSelectorPanel
      isOpen={isOpen}
      loading={loading}
      saving={saving}
      selectedCount={selectedCount}
      selectedNames={selectedNames}
      subsList={subsList}
      selectedSubscriptions={selectedSubscriptions}
      onOpen={handleOpen}
      onClose={() => setIsOpen(false)}
      onToggle={handleToggleSubscription}
      onSave={handleSave}
      onCancel={handleCancel}
    />
  );
}

function SubscriptionSelectorPanel({
  isOpen,
  loading,
  saving,
  selectedCount,
  selectedNames,
  subsList,
  selectedSubscriptions,
  onOpen,
  onClose,
  onToggle,
  onSave,
  onCancel,
}) {
  return (
    <div className="relative">
      <button
        type="button"
        onClick={onOpen}
        className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
      >
        <span className="text-gray-600">Subscriptions:</span>
        <span className="font-semibold text-gray-900">
          {selectedCount > 0 ? `${selectedCount} selected` : 'Manage'}
        </span>
        <ChevronDown className={`w-3 h-3 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen ? (
        <>
          <div className="fixed inset-0 z-10" onClick={onClose} />
          <div className="absolute top-full left-0 mt-1 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-20 max-h-96 overflow-hidden flex flex-col">
            <div className="p-3 border-b border-gray-200 bg-gray-50">
              <SubscriptionSelectorHeader
                selectedCount={selectedCount}
                selectedNames={selectedNames}
              />
            </div>

            <div className="flex-1 overflow-y-auto p-2">
              {loading ? (
                <div className="flex items-center justify-center gap-2 py-6 text-xs text-gray-600">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Loading subscriptions...</span>
                </div>
              ) : subsList.length === 0 ? (
                <div className="text-center py-4 text-xs text-gray-500">
                  No subscriptions available
                </div>
              ) : (
                <div className="space-y-1">
                  {subsList.map((subscription) => {
                    const isSelected = selectedSubscriptions.includes(subscription.id);
                    const isPending = subscription.status === 'pending';
                    return (
                      <label
                        key={subscription.id}
                        title={isPending ? 'This subscription is awaiting approval.' : undefined}
                        onClick={isPending ? (e) => e.preventDefault() : undefined}
                        className={`flex items-center gap-2 p-2 rounded-md transition-colors ${
                          isPending
                            ? 'bg-red-50 border border-red-200 cursor-not-allowed'
                            : isSelected
                              ? 'bg-blue-50 border border-blue-200 cursor-pointer'
                              : 'hover:bg-gray-50 border border-transparent cursor-pointer'
                        }`}
                      >
                        <div className="relative flex items-center justify-center w-4 h-4">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            disabled={isPending}
                            onChange={() => onToggle(subscription.id)}
                            className={`absolute opacity-0 ${isPending ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                          />
                          <div
                            className={`w-4 h-4 border-2 rounded flex items-center justify-center transition-colors ${
                              isSelected
                                ? 'bg-blue-600 border-blue-600'
                                : 'border-gray-300 bg-white'
                            }`}
                          >
                            {isSelected ? <Check className="w-3 h-3 text-white" /> : null}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 text-xs font-medium text-gray-900">
                            <span className="truncate">{subscription.name}</span>
                            {isPending ? (
                              <span className="shrink-0 rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold text-red-600">
                                Pending
                              </span>
                            ) : null}
                          </div>
                          {subscription.description ? (
                            <div className="text-xs text-gray-500 truncate">
                              {subscription.description}
                            </div>
                          ) : null}
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="p-3 border-t border-gray-200 bg-gray-50 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onCancel}
                disabled={saving || loading}
                className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onSave}
                disabled={saving || loading}
                className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  'Save'
                )}
              </button>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}

function SubscriptionSelectorHeader({ selectedCount, selectedNames }) {
  return (
    <>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-semibold text-gray-900">Select Subscriptions</h3>
        <span className="text-xs text-gray-600">{selectedCount} selected</span>
      </div>
      {selectedNames ? (
        <p className="text-xs text-gray-600 truncate" title={selectedNames}>
          {selectedNames}
        </p>
      ) : null}
    </>
  );
}

const subscriptionShape = PropTypes.shape({
  id: PropTypes.number.isRequired,
  name: PropTypes.string.isRequired,
  description: PropTypes.string,
});

SubscriptionSelectorPanel.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  loading: PropTypes.bool.isRequired,
  saving: PropTypes.bool.isRequired,
  selectedCount: PropTypes.number.isRequired,
  selectedNames: PropTypes.string.isRequired,
  subsList: PropTypes.arrayOf(subscriptionShape).isRequired,
  selectedSubscriptions: PropTypes.arrayOf(PropTypes.number).isRequired,
  onOpen: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
  onToggle: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
};

SubscriptionSelectorHeader.propTypes = {
  selectedCount: PropTypes.number.isRequired,
  selectedNames: PropTypes.string.isRequired,
};

CompanySubscriptionSelector.propTypes = {
  companyId: PropTypes.string.isRequired,
  availableSubscriptions: PropTypes.arrayOf(subscriptionShape),
  ensureAvailableSubscriptions: PropTypes.func,
  getCompanySubscriptionIds: PropTypes.func.isRequired,
  setCompanySubscriptionIds: PropTypes.func.isRequired,
  invalidateCompany: PropTypes.func.isRequired,
  onUpdate: PropTypes.func,
};

export { CompanySubscriptionSelector };
