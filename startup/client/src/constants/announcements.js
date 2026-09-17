/**
 * How loudly an announcement is drawn. The value is what the server stores and
 * what the banner styles itself from; the label is what the form offers.
 */
const ANNOUNCEMENT_SEVERITIES = [
  { value: 'info', label: 'Information' },
  { value: 'warning', label: 'Warning' },
  { value: 'critical', label: 'Critical' }
];

const ANNOUNCEMENT_SEVERITY_STYLE = {
  info: 'bg-blue-50 border-blue-200 text-blue-900',
  warning: 'bg-amber-50 border-amber-200 text-amber-900',
  critical: 'bg-rose-50 border-rose-200 text-rose-900'
};

// A dismissal is this reader's alone and has to outlive a refresh, so it lives
// in the browser rather than on the announcement.
const ANNOUNCEMENT_DISMISSED_KEY = 'nbnext.announcements.dismissed';

export { ANNOUNCEMENT_SEVERITIES, ANNOUNCEMENT_SEVERITY_STYLE, ANNOUNCEMENT_DISMISSED_KEY };
