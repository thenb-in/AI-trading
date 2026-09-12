import { BellRing } from 'lucide-react';
import { NotificationLogReport } from '../components/report/reports/notification_log/NotificationLogReport';

// Reports the framework itself ships, the counterpart to genericMasterModules
// and genericAppModules. reportModuleRegistry merges these with whatever the app
// registers, so an app gets them without listing anything.
//
// A report belongs here only when everything it reads is framework-owned.

const getGenericReportModules = () => [
  {
    id: 'notification-log-report',
    title: 'Notification Log Report',
    slug: 'notification-log-report',
    permissionName: 'read_notification-log-report',
    desc: 'Every message a notification rule sent, over which channel it went, who it was for and whether it arrived',
    category: 'administration',
    color: 'blue',
    icon: BellRing,
    component: NotificationLogReport,
  }
];

const genericReportCategories = [
  { id: 'all', name: 'All Reports' },
  { id: 'administration', name: 'Administration' },
];

export { getGenericReportModules, genericReportCategories };
