import { useRef, useState } from 'react';
import { CreditCard, Loader2, Plus, Globe, Building2, Crown, Download, Upload } from 'lucide-react';
import { toast } from 'react-toastify';
import { useSubscriptions } from './hooks/useSubscriptions';
import { SubscriptionSelector } from './components/SubscriptionSelector';
import { SubscriptionPermissionSection } from './components/SubscriptionPermissionSection';
import { AlertMessage } from '../role_permissions/components/AlertMessage';
import { CreateSubscriptionModal } from './components/CreateSubscriptionModal';
import { HeadBaseButton } from './components/HeadBaseButton';
import { organizePermissions, hasNoOrganizedPermissions } from './utils/permissionUtils';
import { useDataContext } from '@context/useDataContext';
import { ApiService } from '@services/ApiService';
  
function SubscriptionPage() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const importFileRef = useRef(null);
  const { userData } = useDataContext();
  const {
    subscriptions,
    permissions,
    selectedSubscriptionId,
    selectedSubscription,
    loading,
    error,
    updating,
    setSelectedSubscriptionId,
    updatePermissionStatus,
    updateMultiplePermissionStatuses,
    refetch,
  } = useSubscriptions();

  const organizedPermissions = organizePermissions(permissions);

  const handleExport = async () => {
    if (!selectedSubscription) {
      toast.error('Select a subscription to export');
      return;
    }
    setIsExporting(true);
    try {
      const response = await ApiService.exportSubscription(selectedSubscription.id);
      const blob = response.data instanceof Blob
        ? response.data
        : new Blob([JSON.stringify(response.data, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      const safeName = (selectedSubscription.name || 'subscription').replace(/[^a-z0-9-_]+/gi, '_');
      link.href = url;
      link.download = `subscription_${safeName}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Subscription exported');
    } catch (err) {
      toast.error(err?.message || 'Failed to export subscription');
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportClick = () => {
    if (importFileRef.current) {
      importFileRef.current.value = '';
      importFileRef.current.click();
    }
  };

  const handleImportFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setIsImporting(true);
    try {
      const text = await file.text();
      let payload;
      try {
        payload = JSON.parse(text);
      } catch {
        throw new Error('Selected file is not valid JSON');
      }
      if (payload?.isGlobal && !userData?.isSupportUser) {
        throw new Error('Only superadmins can import global subscriptions');
      }
      const response = await ApiService.importSubscription(payload);
      toast.success(response.data?.message || 'Subscription imported');
      refetch();
    } catch (err) {
      toast.error(err?.message || 'Failed to import subscription');
    } finally {
      setIsImporting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <Loader2 className="w-5 h-5 animate-spin text-blue-600 mx-auto mb-2" />
        <p className="text-xs text-gray-600">Loading...</p>
      </div>
    );
  }

  return (
    <div className="p-3 max-w-7xl mx-auto">
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <Crown className="w-5 h-5 text-yellow-600" />
            <h1 className="text-xl font-bold text-gray-900">Subscriptions</h1>
          </div>
          <div className="flex items-center gap-2">
            <HeadBaseButton />
            <button
              onClick={handleExport}
              disabled={!selectedSubscription || isExporting}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title={selectedSubscription ? 'Export the selected subscription' : 'Select a subscription to export'}
            >
              {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              Export
            </button>
            <button
              onClick={handleImportClick}
              disabled={isImporting}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Import a subscription JSON file"
            >
              {isImporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              Import
            </button>
            <input
              ref={importFileRef}
              type="file"
              accept="application/json,.json"
              onChange={handleImportFile}
              className="hidden"
            />
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Subscription
            </button>
          </div>
        </div>
        <p className="text-xs text-gray-600">
          Manage subscription permissions by selecting a subscription and setting permission status below.
        </p>
      </div>

      {error && (
        <div className="mb-3">
          <AlertMessage
            type="error"
            message={error}
            onDismiss={() => window.location.reload()}
          />
        </div>
      )}

      <SubscriptionSelector
        subscriptions={subscriptions}
        selectedSubscriptionId={selectedSubscriptionId}
        onSelect={setSelectedSubscriptionId}
        loading={loading}
      />
      
      {selectedSubscription && (
        <div className="mb-3 flex items-center gap-2 text-xs">
          {selectedSubscription.isGlobal ? (
            <>
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-50 text-purple-700 rounded">
                <Globe className="w-3 h-3" />
                Global Subscription
              </span>
              {!userData?.isSupportUser && (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-orange-50 text-orange-700 rounded border border-orange-200">
                  <CreditCard className="w-3 h-3" />
                  Read-Only (Default Subscriptions)
                </span>
              )}
            </>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded">
              <Building2 className="w-3 h-3" />
              Company-Specific Subscription
            </span>
          )}
        </div>
      )}

      {!selectedSubscriptionId ? (
        <div className="bg-yellow-50 border border-yellow-200 rounded p-3 text-center">
          <p className="text-xs text-yellow-800">
            Please select a subscription to manage its permissions.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Module Permissions */}
          {organizedPermissions.module.length > 0 && (
            <SubscriptionPermissionSection
              title="Module Permissions"
              permissions={organizedPermissions.module}
              category="module"
              selectedSubscription={selectedSubscription}
              onUpdatePermissionStatus={updatePermissionStatus}
              onUpdateMultiplePermissionStatuses={updateMultiplePermissionStatuses}
              updating={updating}
            />
          )}

          {/* Report Permissions */}
          {Object.keys(organizedPermissions.report).length > 0 && (
            <SubscriptionPermissionSection
              title="Report Permissions"
              permissions={organizedPermissions.report}
              category="report"
              selectedSubscription={selectedSubscription}
              onUpdatePermissionStatus={updatePermissionStatus}
              onUpdateMultiplePermissionStatuses={updateMultiplePermissionStatuses}
              updating={updating}
            />
          )}

          {/* Master Permissions */}
          {Object.keys(organizedPermissions.master).length > 0 && (
            <SubscriptionPermissionSection
              title="Master Permissions"
              permissions={organizedPermissions.master}
              category="master"
              selectedSubscription={selectedSubscription}
              onUpdatePermissionStatus={updatePermissionStatus}
              onUpdateMultiplePermissionStatuses={updateMultiplePermissionStatuses}
              updating={updating}
            />
          )}

          {/* Other Permissions - For Investigation */}
          {organizedPermissions.other && organizedPermissions.other.length > 0 && (
            <SubscriptionPermissionSection
              title="Other Permissions (Investigation Needed)"
              permissions={organizedPermissions.other}
              category="other"
              selectedSubscription={selectedSubscription}
              onUpdatePermissionStatus={updatePermissionStatus}
              onUpdateMultiplePermissionStatuses={updateMultiplePermissionStatuses}
              updating={updating}
            />
          )}

          {hasNoOrganizedPermissions(organizedPermissions) && (
              <div className="bg-gray-50 border border-gray-200 rounded p-3 text-center">
                <p className="text-xs text-gray-600">No permissions found.</p>
              </div>
            )}
        </div>
      )}

      {selectedSubscription && (
        <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded text-xs">
          <div className="flex items-center justify-between">
            <div>
              <span className="font-medium text-blue-900">
                Managing: <span className="font-semibold">{selectedSubscription.name}</span>
              </span>
              {selectedSubscription.description && (
                <span className="text-blue-700 ml-2">{selectedSubscription.description}</span>
              )}
            </div>
            <span className="text-blue-700">
              {selectedSubscription.permissions?.filter(p => p.subscriptionStatus === 'subscribed').length || 0} subscribed
            </span>
          </div>
        </div>
      )}

      <CreateSubscriptionModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={refetch}
      />
    </div>
  );
}

export { SubscriptionPage };
