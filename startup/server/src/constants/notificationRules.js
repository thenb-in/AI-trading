const RULE_CHANNEL = {
  IN_APP: 'in_app',
  EMAIL: 'email',
  WHATSAPP: 'whatsapp'
};


const RULE_CHANNEL_LABEL = {
  [RULE_CHANNEL.IN_APP]: 'In-App',
  [RULE_CHANNEL.EMAIL]: 'Mail',
  [RULE_CHANNEL.WHATSAPP]: 'WhatsApp'
};

// The five audiences, unioned and deduplicated at send time.
const RECIPIENT_MODE = {
  COMPANY: 'company',
  ROLE: 'role',
  PERMISSION: 'permission',
  USERS: 'users',
  ADDRESSES: 'addresses'
};

const RULE_WIRE_TO_MODEL = {
  name: 'name',
  is_active: 'isActive',
  recipients: 'recipients',
  channels: 'channels',
  only_the_subject: 'onlyTheSubject'
};

// {{variables}} in a message body.
const VARIABLE_PATTERN = /\{\{\s*([\w.]+)\s*\}\}/g;


const NO_RECIPIENTS_LABEL = 'Nobody yet';

const SUBJECT_RECIPIENT_LABEL = 'whoever each message is about';
const COMPANY_RECIPIENT_LABEL = 'everyone in the company';

const DELIVERY_STATUS = {
  SENT: 'sent',
  SKIPPED: 'skipped',
  FAILED: 'failed'
};

module.exports = {
  RULE_CHANNEL,
  RULE_CHANNEL_LABEL,
  RECIPIENT_MODE,
  RULE_WIRE_TO_MODEL,
  VARIABLE_PATTERN,
  NO_RECIPIENTS_LABEL,
  SUBJECT_RECIPIENT_LABEL,
  COMPANY_RECIPIENT_LABEL,
  DELIVERY_STATUS
};
