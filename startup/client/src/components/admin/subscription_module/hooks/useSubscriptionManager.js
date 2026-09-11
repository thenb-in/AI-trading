import { useRef, useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { ApiService } from '@services/ApiService';
import { useDataContext } from '@context/useDataContext';
import { useSubscriptions } from './useSubscriptions';
import { useSubscriptionPermissionDraft } from './useSubscriptionPermissionDraft';

function useSubscriptionManager() {
  const { userData } = useDataContext();
  const isSupportUser = !!userData?.isSupportUser;

  const {
    subscriptions,
    permissions,
    selectedSubscriptionId,
    selectedSubscription,
    loading,
    error,
    setSelectedSubscriptionId,
    refetch,
  } = useSubscriptions();

  const draft = useSubscriptionPermissionDraft(permissions);
  const { reset: resetDraft, getStatus, dirtyCount, changedRows, setStatus, setMany } = draft;

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isPushing, setIsPushing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const importFileRef = useRef(null);

  const isDirty = dirtyCount > 0;
  // Global (default) subscriptions are server-side read-only for non-support users.
  const isReadOnly = !!selectedSubscription?.isGlobal && !isSupportUser;
  const walletEnabled = subscriptions.some((subscription) => subscription.walletEnabled);

  // Re-seed the draft from the saved statuses whenever the selected subscription changes.
  // Keyed on id only — refetches that keep the same selection must not wipe in-progress edits.
  useEffect(() => {
    resetDraft(selectedSubscription?.permissions || []);
  }, [selectedSubscriptionId, resetDraft]);

  // Warn before leaving the tab with unsaved changes.
  useEffect(() => {
    if (!isDirty) return undefined;
    const handler = (event) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  const selectSubscription = useCallback((id) => {
    if (isDirty && !window.confirm('You have unsaved permission changes. Discard them?')) {
      return;
    }
    setSelectedSubscriptionId(id);
  }, [isDirty, setSelectedSubscriptionId]);

  const discardChanges = useCallback(() => {
    resetDraft(selectedSubscription?.permissions || []);
  }, [resetDraft, selectedSubscription]);

  const saveChanges = useCallback(async () => {
    if (!selectedSubscriptionId || changedRows.length === 0) return;
    setIsSaving(true);
    try {
      await ApiService.updateSubscriptionPermissions(selectedSubscriptionId, changedRows, selectedSubscription?.isGlobal);
      toast.success(`Saved ${changedRows.length} change(s)`);
      // The draft is now the saved truth — commit it so dirty state clears without a flicker.
      resetDraft(permissions.map((p) => ({ id: p.id, subscriptionStatus: getStatus(p.id) })));
      refetch();
    } catch (err) {
      toast.error(err?.message || 'Failed to save changes');
    } finally {
      setIsSaving(false);
    }
  }, [selectedSubscriptionId, selectedSubscription, changedRows, permissions, getStatus, resetDraft, refetch]);

  const exportSubscription = useCallback(async () => {
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
  }, [selectedSubscription]);

  const pushToWallet = useCallback(async () => {
    if (!selectedSubscription) {
      toast.error('Select a subscription to push');
      return;
    }
    if (selectedSubscription.pushed) {
      toast.info('This plan is already pushed to the wallet');
      return;
    }
    setIsPushing(true);
    try {
      const response = await ApiService.pushSubscriptionToWallet(selectedSubscription.id);
      toast.success(response.data?.message || 'Plan pushed to wallet');
      refetch();
    } catch (err) {
      toast.error(err?.message || 'Failed to push plan to wallet');
    } finally {
      setIsPushing(false);
    }
  }, [selectedSubscription, refetch]);

  const openImportPicker = useCallback(() => {
    if (importFileRef.current) {
      importFileRef.current.value = '';
      importFileRef.current.click();
    }
  }, []);

  const importSubscriptionFile = useCallback(async (event) => {
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
      if (payload?.isGlobal && !isSupportUser) {
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
  }, [isSupportUser, refetch]);

  return {
    // data
    subscriptions,
    permissions,
    selectedSubscriptionId,
    selectedSubscription,
    loading,
    error,
    isSupportUser,
    // permission draft
    getStatus,
    setStatus,
    setMany,
    isDirty,
    dirtyCount,
    isReadOnly,
    walletEnabled,
    // flags
    isSaving,
    isExporting,
    isImporting,
    isPushing,
    // create modal
    isCreateModalOpen,
    openCreateModal: () => setIsCreateModalOpen(true),
    closeCreateModal: () => setIsCreateModalOpen(false),
    // import file input
    importFileRef,
    // handlers
    selectSubscription,
    discardChanges,
    saveChanges,
    exportSubscription,
    pushToWallet,
    openImportPicker,
    importSubscriptionFile,
    refetch,
  };
}

export { useSubscriptionManager };
