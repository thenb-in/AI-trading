import { useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'react-toastify';
import { getApiErrorMessage } from '@utils/apiErrorMessage';
import { notificationRuleService } from '@services/notificationRuleService';
import { EMPTY_RULE, RECIPIENT_MODE } from './constants';



function useNotificationRuleForm({ isOpen, initialData, onSaved, onClose }) {
  const [rule, setRule] = useState(EMPTY_RULE);

  const isEditMode = Boolean(initialData?.id);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    setRule(initialData
      ? { ...EMPTY_RULE, ...initialData, name: initialData.rule_name || initialData.name }
      : EMPTY_RULE);
  }, [isOpen, initialData]);

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

  // The company mode is a flag, the rest are lists.
  const recipientCount = useCallback((mode) => {
    const value = rule.recipients?.[mode];
    return Array.isArray(value) ? value.length : Number(Boolean(value));
  }, [rule.recipients]);

  const totalRecipients = useMemo(
    () => Object.values(RECIPIENT_MODE).reduce((sum, mode) => sum + recipientCount(mode), 0),
    [recipientCount]
  );

  const submit = useCallback(async () => {
    try {
      const response = isEditMode
        ? await notificationRuleService.update(initialData.id, rule)
        : await notificationRuleService.create(rule);

      toast.success(response.data?.message || `${rule.name} saved`);
      onSaved?.();
      onClose();
    } catch (saveError) {
      toast.error(getApiErrorMessage(saveError, `Could not save ${rule.name}`));
    }
  }, [rule, isEditMode, initialData, onSaved, onClose]);

  return {
    rule,
    recipientCount,
    totalRecipients,
    patchRule,
    setRecipient,
    setChannel,
    submit
  };
}

export { useNotificationRuleForm };
