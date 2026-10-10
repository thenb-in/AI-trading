'use strict';

const http = require('http');
const https = require('https');
const { URL } = require('url');
const logger = require('@startup/logger');
const env = require('../config/env');

// Same mailer service used by the wallet app. Full send-endpoint URL comes
// from config (MAILER_URL); the legacy source hardcoded this value.
const MAILER_URL = env.MAILER_URL;

// Secret key is persisted in DB (app_settings table) so the user does not re-enter on every restart.
// Signal recipient comes from SIGNAL_EMAIL_TO env var only (not stored in DB).
const SETTINGS_KEY = 'mailer';
let _secretKey = env.MAILER_SECRET_KEY || '';
const _signalEmail = env.SIGNAL_EMAIL_TO || '';

function getAppSettingModel() {
  // Lazy require: model file initializes against the framework's sequelize instance,
  // which isn't ready when this util is first imported at app boot.
  try { return require('../models').AppSetting; }
  catch { return null; }
}

async function loadMailerConfig() {
  const AppSetting = getAppSettingModel();
  if (!AppSetting) return;
  try {
    const row = await AppSetting.findByPk(SETTINGS_KEY);
    if (row?.value && typeof row.value.secretKey === 'string') {
      _secretKey = row.value.secretKey;
    }
  } catch (err) {
    logger.error(`[Mailer] Failed to load config from DB: ${err.message}`);
  }
}

async function setMailerConfig({ secretKey }) {
  if (secretKey === undefined) return;
  _secretKey = secretKey;
  const AppSetting = getAppSettingModel();
  if (AppSetting) {
    await AppSetting.upsert({ key: SETTINGS_KEY, value: { secretKey: _secretKey } });
  }
}

function getMailerConfig() {
  return {
    secretKeySet: _secretKey.length > 0,
    secretKey:    _secretKey,
    signalEmail:  _signalEmail,
  };
}

function getSignalEmail()  { return _signalEmail; }
function getSecretKey()    { return _secretKey; }

async function sendMail(subject, content, toEmail) {
  logger.info(`[Mailer] sendMail — subject: "${subject}", to: ${toEmail || '(none)'}`);

  if (!_secretKey) {
    logger.warn('[Mailer] MAILER_SECRET_KEY not set — skipping (configure in dashboard settings)');
    return;
  }

  const payload = { subject, content, email_secret_key: _secretKey };
  if (toEmail) {
    payload.to_email = toEmail;
  } else {
    logger.warn(`[Mailer] No to_email for subject="${subject}"`);
  }

  const body = JSON.stringify(payload);

  return new Promise((resolve, reject) => {
    const url = new URL(MAILER_URL);
    const lib = url.protocol === 'https:' ? https : http;

    const options = {
      hostname: url.hostname,
      port:     url.port || (url.protocol === 'https:' ? 443 : 80),
      path:     url.pathname + url.search,
      method:   'POST',
      headers: {
        'Content-Type':   'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    };

    const req = lib.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          logger.info(`[Mailer] Sent — subject: "${subject}", to: ${toEmail}`);
          resolve(data);
        } else {
          logger.error(`[Mailer] Failed — status: ${res.statusCode}, body: ${data}`);
          resolve(data);
        }
      });
    });

    req.on('error', (err) => {
      logger.error(`[Mailer] Request error — ${err.message}`);
      reject(err);
    });

    req.write(body);
    req.end();
  });
}

module.exports = { sendMail, setMailerConfig, getMailerConfig, getSignalEmail, getSecretKey, loadMailerConfig };
