import { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { Check, ChevronDown, Loader2 } from 'lucide-react';
import { ApiService } from '@services/ApiService';
import { toast } from 'react-toastify';

function CompanySubscriptionSelector({ companyId, availableSubscriptions = [], onUpdate }) {
  const [selectedSubscriptions, setSelectedSubscriptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const fetchCompanySubscriptions = useCallback(async () => {
    if (!companyId) return;

    setLoading(true);
    try {
      const companyRes = await ApiService.getCompanySubscriptions(companyId);
      const companySubs = companyRes?.data?.data || [];
      setSelectedSubscriptions(companySubs.map(s => s.id));
    } catch (error) {
      console.error('Error fetching company subscriptions', error);
      toast.error(error?.message || 'Failed to load subscriptions');
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    if (companyId) {
      fetchCompanySubscriptions();
    }
  }, [companyId, fetchCompanySubscriptions]);

  const handleToggleSubscription = useCallback((subscriptionId) => {
    setSelectedSubscriptions(prev => {
      if (prev.includes(subscriptionId)) {
        return prev.filter(id => id !== subscriptionId);
      }
      return [...prev, subscriptionId];
    });
  }, []);

  const handleSave = useCallback(async () => {
    if (!companyId) return;

    setSaving(true);
    try {
      await ApiService.setCompanySubscriptions(companyId, selectedSubscriptions);
      toast.success('Subscriptions updated successfully');
      setIsOpen(false);
      if (onUpdate) {
        onUpdate();
      }
    } catch (error) {
      console.error('Error saving subscriptions', error);
      toast.error(error?.message || 'Failed to save subscriptions');
    } finally {
      setSaving(false);
    }
  }, [companyId, selectedSubscriptions, onUpdate]);

  const handleCancel = useCallback(() => {
    fetchCompanySubscriptions();
    setIsOpen(false);
  }, [fetchCompanySubscriptions]);

  const selectedCount = selectedSubscriptions.length;
  const selectedNames = availableSubscriptions
    .filter(s => selectedSubscriptions.includes(s.id))
    .map(s => s.name)
    .join(', ');

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-xs text-gray-600">
        <Loader2 className="w-3 h-3 animate-spin" />
        <span>Loading subscriptions...</span>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
      >
        <span className="text-gray-600">Subscriptions:</span>
        <span className="font-semibold text-gray-900">
          {selectedCount > 0 ? `${selectedCount} selected` : 'None'}
        </span>
        <ChevronDown className={`w-3 h-3 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute top-full left-0 mt-1 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-20 max-h-96 overflow-hidden flex flex-col">
            <div className="p-3 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-semibold text-gray-900">Select Subscriptions</h3>
                <span className="text-xs text-gray-600">{selectedCount} selected</span>
              </div>
              {selectedNames && (
                <p className="text-xs text-gray-600 truncate" title={selectedNames}>
                  {selectedNames}
                </p>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-2">
              {availableSubscriptions.length === 0 ? (
                <div className="text-center py-4 text-xs text-gray-500">
                  No subscriptions available
                </div>
              ) : (
                <div className="space-y-1">
                  {availableSubscriptions.map((subscription) => {
                    const isSelected = selectedSubscriptions.includes(subscription.id);
                    return (
                      <label
                        key={subscription.id}
                        className={`flex items-center gap-2 p-2 rounded-md cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-blue-50 border border-blue-200'
                            : 'hover:bg-gray-50 border border-transparent'
                        }`}
                      >
                        <div className="relative flex items-center justify-center w-4 h-4">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSubscription(subscription.id)}
                            className="absolute opacity-0 cursor-pointer"
                          />
                          <div
                            className={`w-4 h-4 border-2 rounded flex items-center justify-center transition-colors ${
                              isSelected
                                ? 'bg-blue-600 border-blue-600'
                                : 'border-gray-300 bg-white'
                            }`}
                          >
                            {isSelected && <Check className="w-3 h-3 text-white" />}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-medium text-gray-900 truncate">
                            {subscription.name}
                          </div>
                          {subscription.description && (
                            <div className="text-xs text-gray-500 truncate">
                              {subscription.description}
                            </div>
                          )}
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
                onClick={handleCancel}
                disabled={saving}
                className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
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
      )}
    </div>
  );
}

CompanySubscriptionSelector.propTypes = {
  companyId: PropTypes.string.isRequired,
  availableSubscriptions: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.number.isRequired,
      name: PropTypes.string.isRequired,
      description: PropTypes.string,
    })
  ),
  onUpdate: PropTypes.func,
};

export { CompanySubscriptionSelector };

