import { Crown } from 'lucide-react';
import { useSubscriptionManager } from './hooks/useSubscriptionManager';
import { SubscriptionSelector } from './components/SubscriptionSelector';
import { SubscriptionPermissionEditor } from './components/SubscriptionPermissionEditor';
import { SubscriptionToolbar } from './components/SubscriptionToolbar';
import { SubscriptionBadge } from './components/SubscriptionBadge';
import { SaveControls } from './components/SaveControls';
import { Loader } from '@/components/common/Loader';
import { AlertMessage } from '../role_permissions/components/AlertMessage';
import { CreateSubscriptionModal } from './components/CreateSubscriptionModal';
import { HeadBaseButton } from './components/HeadBaseButton';


function SubscriptionPage() {
  const sm = useSubscriptionManager();

  if (sm.loading) {
    return <Loader message="Loading subscriptions..." />;
  }

  const saveControls = (
    <SaveControls
      isDirty={sm.isDirty}
      dirtyCount={sm.dirtyCount}
      isSaving={sm.isSaving}
      onDiscard={sm.discardChanges}
      onSave={sm.saveChanges}
    />
  );

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
            <SubscriptionToolbar
              canExport={!!sm.selectedSubscription}
              isExporting={sm.isExporting}
              isImporting={sm.isImporting}
              canPush={!!sm.selectedSubscription}
              isPushed={!!sm.selectedSubscription?.pushed}
              isPushing={sm.isPushing}
              onPush={sm.pushToWallet}
              importFileRef={sm.importFileRef}
              onExport={sm.exportSubscription}
              onImportClick={sm.openImportPicker}
              onImportFile={sm.importSubscriptionFile}
              onAdd={sm.openCreateModal}
            />
          </div>
        </div>
        <p className="text-xs text-gray-600">
          Manage subscription permissions by selecting a subscription, setting permission status, and saving your changes.
        </p>
      </div>

      {sm.error && (
        <div className="mb-3">
          <AlertMessage
            type="error"
            message={sm.error}
            onDismiss={() => window.location.reload()}
          />
        </div>
      )}

      <SubscriptionSelector
        subscriptions={sm.subscriptions}
        selectedSubscriptionId={sm.selectedSubscriptionId}
        onSelect={sm.selectSubscription}
        loading={sm.loading}
      />

      {sm.selectedSubscription && (
        <div className="mb-3 flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <SubscriptionBadge subscription={sm.selectedSubscription} isSupportUser={sm.isSupportUser} />
          </div>
          {!sm.isReadOnly && saveControls}
        </div>
      )}

      {!sm.selectedSubscriptionId ? (
        <div className="bg-yellow-50 border border-yellow-200 rounded p-3 text-center">
          <p className="text-xs text-yellow-800">
            Please select a subscription to manage its permissions.
          </p>
        </div>
      ) : (
        <SubscriptionPermissionEditor
          permissions={sm.permissions}
          getStatus={sm.getStatus}
          onUpdatePermissionStatus={sm.setStatus}
          onUpdateMultiplePermissionStatuses={sm.setMany}
          updating={sm.isSaving || sm.isReadOnly}
        />
      )}

      {sm.selectedSubscription && !sm.isReadOnly && (
        <div className="sticky bottom-0 mt-3 p-2 bg-blue-50 border border-blue-200 rounded text-xs shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <span className="font-medium text-blue-900">
                Managing: <span className="font-semibold">{sm.selectedSubscription.name}</span>
              </span>
            </div>
            <div className="shrink-0">
              <SaveControls
                isDirty={sm.isDirty}
                dirtyCount={sm.dirtyCount}
                isSaving={sm.isSaving}
                onDiscard={sm.discardChanges}
                onSave={sm.saveChanges}
                showSavedHint
              />
            </div>
          </div>
        </div>
      )}

      <CreateSubscriptionModal
        isOpen={sm.isCreateModalOpen}
        onClose={sm.closeCreateModal}
        onSuccess={sm.refetch}
        permissions={sm.permissions}
      />
    </div>
  );
}

export { SubscriptionPage };
