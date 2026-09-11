const axios = require('axios');
const FormData = require('form-data');
const logger = require('../../logger');
const env = require('../../src/config/env');
const { normalizeEmail } = require('../../src/utils/normalizeUtils');

/**
 * Send one mail through the mailer app.
 */
async function sendMail({ to, subject, body, attachments = [] } = {}) {
  const recipient = normalizeEmail(to);
  if (!recipient) {
    return { sent: false, skipped: true, reason: 'invalid_email' };
  }
  if (!env.MAILER_URL || !env.MAILER_EMAIL_SECRET_KEY) {
    return { sent: false, skipped: true, reason: 'mailer_not_configured' };
  }
  try {
    const form = new FormData();
    form.append('to_email', recipient);
    form.append('subject', subject);
    form.append('content', body);
    form.append('email_secret_key', env.MAILER_EMAIL_SECRET_KEY);

    for (const { filename, content, contentType } of attachments) {
      form.append('attachments', content, { filename, contentType });
    }

    await axios.post(`${env.MAILER_URL}/api/v1/mail/send`, form, {
      headers: form.getHeaders(),
      timeout: 30000,
      maxBodyLength: Infinity
    });
    return { sent: true };
  } catch (err) {

    const reason = err.response?.data?.message || err.message;
    logger.error(`[mailer] send to ${recipient} failed: ${reason}`, err);
    return { sent: false, reason };
  }
}

module.exports = { sendMail };
