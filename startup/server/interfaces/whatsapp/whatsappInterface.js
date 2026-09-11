const axios = require('axios');
const logger = require('../../logger');
const env = require('../../src/config/env');
const { normalizePhone, singleLine } = require('../../src/utils/normalizeUtils');

// Each variable's value on one line of its own.
const oneLineValues = (values = {}) =>
  Object.fromEntries(Object.entries(values).map(([name, value]) => [name, singleLine(value, ' ')]));

// Send one approved WhatsApp template:
async function sendWhatsappMessage({ phone, templateName, header, body, text } = {}) {
  const to = normalizePhone(phone);
  if (!to) {
    return { sent: false, skipped: true, reason: 'invalid_phone' };
  }
  if (!templateName) {
    return { sent: false, skipped: true, reason: 'no_template' };
  }
  if (!env.WHATSAPP_SENDER_URL || !env.WHATSAPP_SENDER_APP_KEY) {
    return { sent: false, skipped: true, reason: 'sender_not_configured' };
  }

  try {
    await axios.post(
      `${env.WHATSAPP_SENDER_URL}/whatsapp-external/send`,
      {
        phone: to,
        templateName,
        header: oneLineValues(header),
        body: oneLineValues(body),
        text: singleLine(text)
      },
      {
        headers: { 'x-whatsapp-sender-app-key': env.WHATSAPP_SENDER_APP_KEY },
        timeout: 15000
      }
    );
    return { sent: true };
  } catch (err) {
    const data = err.response?.data;
    const reason = data?.error?.message || data?.error || data?.message || err.message;
    logger.error(`[whatsapp] send ${templateName} to ${to} failed: ${reason}`, err);
    return { sent: false, reason };
  }
}

module.exports = { sendWhatsappMessage };
