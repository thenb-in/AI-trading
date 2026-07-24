// App-owned audit activity types, registered into startup
const AUDIT_ACTIVITY_TYPES = [
  { action: 'REGISTER_IMAGE', type: 8, messageLabel: 'image was registered' },
  { action: 'VERIFY_IMAGE', type: 9, messageLabel: 'image was verified' },
  { action: 'STOP_PUNCHES', type: 10, messageLabel: 'punches were stopped' }
];

module.exports = { AUDIT_ACTIVITY_TYPES };
