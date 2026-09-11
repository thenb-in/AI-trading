import {
  WhatsApp as WhatsAppIcon,
  Email as EmailIcon,
  NotificationsActive as InAppIcon
} from '@mui/icons-material';


const RULE_CHANNEL = {
  IN_APP: 'in_app',
  EMAIL: 'email',
  WHATSAPP: 'whatsapp'
};

// Five audiences that union at send time.
const RECIPIENT_MODE = {
  COMPANY: 'company',
  ROLE: 'role',
  PERMISSION: 'permission',
  USERS: 'users',
  ADDRESSES: 'addresses'
};

// Written out, not interpolated — Tailwind only ships classes it finds whole.
const CHANNEL_TONES = {
  blue: {
    on: 'border-blue-500 bg-blue-50',
    icon: 'text-blue-600',
    text: 'text-blue-900',
    rail: 'border-blue-400',
    chip: 'bg-blue-100 text-blue-700'
  },
  amber: {
    on: 'border-amber-500 bg-amber-50',
    icon: 'text-amber-600',
    text: 'text-amber-900',
    rail: 'border-amber-400',
    chip: 'bg-amber-100 text-amber-700'
  },
  green: {
    on: 'border-green-500 bg-green-50',
    icon: 'text-green-600',
    text: 'text-green-900',
    rail: 'border-green-400',
    chip: 'bg-green-100 text-green-700'
  }
};


const CHANNEL_LOOK = {
  [RULE_CHANNEL.IN_APP]: { icon: InAppIcon, tone: 'blue', label: 'In-App' },
  [RULE_CHANNEL.EMAIL]: { icon: EmailIcon, tone: 'amber', label: 'Mail' },
  [RULE_CHANNEL.WHATSAPP]: { icon: WhatsAppIcon, tone: 'green', label: 'WhatsApp' }
};


const EMPTY_RULE = {
  name: '',
  is_active: true,
  recipients: {
    [RECIPIENT_MODE.COMPANY]: false,
    [RECIPIENT_MODE.ROLE]: [],
    [RECIPIENT_MODE.PERMISSION]: [],
    [RECIPIENT_MODE.USERS]: [],
    [RECIPIENT_MODE.ADDRESSES]: []
  },
  channels: {
    [RULE_CHANNEL.IN_APP]: { enabled: false, title: '', body: '' },
    [RULE_CHANNEL.EMAIL]: { enabled: false, subject: '', body: '' },
    [RULE_CHANNEL.WHATSAPP]: { enabled: false, template_name: '', body: '' }
  }
};

export {
  RULE_CHANNEL,
  RECIPIENT_MODE,
  CHANNEL_TONES,
  CHANNEL_LOOK,
  EMPTY_RULE
};
