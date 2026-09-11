import { useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'react-toastify';
import { ApiService } from '@services/ApiService';
import { getApiErrorMessage } from '@utils/apiErrorMessage';
import { notificationRuleService } from '@services/notificationRuleService';
import { EMPTY_RULE, RECIPIENT_MODE } from './constants';
import { toPermissionOptions, toRoleOptions, toUserOptions } from './ruleOptions';

const EMPTY_OPTIONS = { permissions: [], roles: [], users: [] };


function useNotificationRuleForm({ isOpen, initialData, onSaved, onClose }) {
  const [rule, setRule] = useState(EMPTY_RULE);
  const [options, setOptions] = useState(EMPTY_OPTIONS);
  const [isLoadingOptions, setIsLoadingOptions] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const isEditMode = Boolean(initialData?.id);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    setRule(initialData
      ? { ...EMPTY_RULE, ...initialData, name: initialData.rule_name || initialData.name }
      : EMPTY_RULE);
  }, [isOpen, initialData]);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }
    let cancelled = false;
    setIsLoadingOptions(true);
    Promise.all([ApiService.getPermissions(), ApiService.getAllUsers()])
      .then(([permissions, users]) => {
        if (cancelled) {
          return;
        }
        setOptions({
          permissions: permissions.data?.data ?? [],
          roles: users.data?.roles ?? [],
          users: users.data?.users ?? []
        });
      })
      .catch((loadError) => {
        if (!cancelled) {
          toast.error(getApiErrorMessage(
            loadError,
            'Could not load permissions, roles and users. Close and reopen to retry.'
          ));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoadingOptions(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  const patchRule = useCallback((patch) => {
    setRule((previous) => ({ ...previous, ...patch }));
  }, []);

  const setRecipient = useCallback((mode, value) => {
    setRule((previous) => ({
      ...previous,
      recipients: { ...previous.recipients, [mode]: value }
    }));
  }, []);

  const setChannel = useCallback((channel, patch) => {
    setRule((previous) => ({
      ...previous,
      channels: { ...previous.channels, [channel]: { ...previous.channels[channel], ...patch } }
    }));
  }, []);

  // The permission the rule is named after, once one is picked.
  const selectedPermission = useMemo(
    () => options.permissions.find((permission) => permission.name === rule.name) || null,
    [options.permissions, rule.name]
  );

  const audience = useMemo(() => ({
    roleOptions: toRoleOptions(options.roles),
    userOptions: toUserOptions(options.users),
    permissionOptions: toPermissionOptions(options.permissions)
  }), [options]);

  // The company mode is a flag, the rest are lists.
  const recipientCount = useCallback((mode) => {
    const value = rule.recipients?.[mode];
    return Array.isArray(value) ? value.length : Number(Boolean(value));
  }, [rule.recipients]);

  const totalRecipients = useMemo(
    () => Object.values(RECIPIENT_MODE).reduce((sum, mode) => sum + recipientCount(mode), 0),
    [recipientCount]
  );

  const submit = useCallback(async (event) => {
    event.preventDefault();

    setIsSaving(true);
    try {
      const response = isEditMode
        ? await notificationRuleService.update(initialData.id, rule)
        : await notificationRuleService.create(rule);

      toast.success(response.data?.message || `${rule.name} saved`);
      onSaved?.();
      onClose();
    } catch (saveError) {
      toast.error(getApiErrorMessage(saveError, `Could not save ${rule.name}`));
    } finally {
      setIsSaving(false);
    }
  }, [rule, isEditMode, initialData, onSaved, onClose]);

  return {
    rule,
    isEditMode,
    isSaving,
    isLoadingOptions,
    permissions: options.permissions,
    selectedPermission,
    audience,
    recipientCount,
    totalRecipients,
    patchRule,
    setRecipient,
    setChannel,
    submit
  };
}

export { useNotificationRuleForm };
