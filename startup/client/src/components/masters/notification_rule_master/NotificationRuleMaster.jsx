import { useCallback, useMemo } from 'react';
import { FlaskConical } from 'lucide-react';
import { toast } from 'react-toastify';

import { BaseMaster } from '@startup/components/base_components/master';
import { MASTERS } from '@startup/constants/masters';
import { notificationRuleService } from '@services/notificationRuleService';
import { NotificationRuleMasterForm } from './NotificationRuleMasterForm';

const PERMISSION_KEYS = {
  read: 'read_notification_rule',
  create: 'create_notification_rule',
  update: 'update_notification_rule',
  delete: 'delete_notification_rule'
};

const loadRules = () => notificationRuleService.list();
const deleteRule = (id) => notificationRuleService.remove(id);

// "1 x no email address; 2 x mailer not configured" - the reason the server bucketed each delivery under.
const describeReasons = (reasons = {}) =>
  Object.entries(reasons)
    .map(([reason, count]) => `${count} x ${String(reason).replace(/_/g, ' ')}`)
    .join('; ');

const NotificationRuleMaster = () => {

  const sendTest = useCallback(async (row) => {
    if (!window.confirm(`Send a test of "${row.name}" to its real recipients? Nothing triggered it, so any {{variables}} in the message go out unfilled.`)) {
      return;
    }
    try {
      const response = await notificationRuleService.sendNow(row.id);
      const { sent = 0, skipped = 0, failed = 0, reasons } = response.data?.data ?? {};
      const detail = describeReasons(reasons);
      if (sent === 0) {
        toast.error(
          `${row.name} test: nothing went out - ${detail || 'the rule has no enabled channel and no recipient'}`
        );
        return;
      }
      if (failed || skipped) {
        toast.warning(`${row.name} test: ${sent} sent, ${failed} failed, ${skipped} skipped - ${detail}`);
        return;
      }
      toast.success(`${row.name} test: ${sent} message(s) sent.`);
    } catch (error) {
      toast.error(
        error?.response?.data?.message || `Could not test ${row.name}: ${error.message}`
      );
    }
  }, []);

  const extraActions = useMemo(
    () => () => [
      {
        label: 'Test',
        icon: <FlaskConical className="w-3 h-3" />,
        type: 'success',
        onClick: (_id, row) => sendTest(row)
      }
    ],
    [sendTest]
  );

  return (
    <BaseMaster
      masterName={MASTERS.NOTIFICATION_RULE}
      title="Notification Rules"
      description="Decide who is told what, and on which channel — in-app, by email or on WhatsApp."
      addButtonText="Add Rule"
      searchPlaceholder="Search rules by name, recipient or channel..."
      baseMasterContainerWidth = 'max-w-8xl'
      createLabel="Create Rule"
      updateLabel="Update Rule"
      modalMaxWidth="lg"
      auditHead="NotificationRule"
      permissionKeys={PERMISSION_KEYS}
      rowsKey="rules"
      loadRows={loadRules}
      deleteRow={deleteRule}
      deleteConfirmText="Delete this rule? Nothing will be sent for it again."
      unauthorizedToast="You are not authorized to view notification rules"
      unauthorizedDeleteToast="You are not authorized to delete a notification rule"
      fetchFailureToast="Failed to load notification rules"
      extraActions={extraActions}
      FormComponent={NotificationRuleMasterForm}
      formSuccessProp="onSaved"
      exportReport={{ title: 'Notification Rules', slug: 'notification-rules' }}
    />
  );
};

export { NotificationRuleMaster };
