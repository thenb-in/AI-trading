import { ListChecks, AlertOctagon, AlertTriangle, CheckCircle2, HelpCircle } from 'lucide-react';

const STATUS_STYLES = {
  critical: {
    badge: 'bg-rose-100 text-rose-700',
    stripe: 'bg-rose-500',
    iconWrapper: 'bg-rose-500',
    bar: 'fill-rose-500',
    barTrack: 'fill-rose-100'
  },
  warn: {
    badge: 'bg-amber-100 text-amber-700',
    stripe: 'bg-amber-400',
    iconWrapper: 'bg-amber-500',
    bar: 'fill-amber-500',
    barTrack: 'fill-amber-100'
  }
};

const STATUS_TABS = [
  { key: 'all', label: 'All', icon: ListChecks, iconColor: 'text-gray-500' },
  { key: 'critical', label: 'Critical', icon: AlertOctagon, iconColor: 'text-rose-500' },
  { key: 'warn', label: 'Warnings', icon: AlertTriangle, iconColor: 'text-amber-500' },
  { key: 'cleared', label: 'Clear', icon: CheckCircle2, iconColor: 'text-emerald-500' },
  { key: 'failed', label: 'Couldn’t run', icon: HelpCircle, iconColor: 'text-gray-400', hideWhenEmpty: true }
];

export { STATUS_STYLES, STATUS_TABS };
