// Thin controller: no req/res, no models — delegates to the mailer util and
// the trade-signal mail service. Mailer config (secret key) persistence lives
// in the mailerService util (AppSetting-backed); signalEmail comes from env.
const mailer = require('../utils/mailerService');
const { sendTradeSignalMail } = require('../services/tradeSignalMailService');

function getConfig() {
  return mailer.getMailerConfig();
}

async function saveConfig(secretKey) {
  await mailer.setMailerConfig({ secretKey });
  return { ok: true, ...mailer.getMailerConfig() };
}

async function sendTest() {
  const recipient = mailer.getSignalEmail();
  if (!recipient) {
    const err = new Error(`No recipient email set. Configure signalEmail first.`);
    err.statusCode = 400;
    throw err;
  }
  // Send a mock recommendation as a test
  const mockRec = {
    action: 'BUY CE (test)',
    optionType: 'CE',
    tradingsymbol: 'NIFTY25MAY24500CE',
    expiry: '2025-05-29',
    spotPrice: 24500,
    premiumEntry: 120,
    premiumSL: 78,
    premiumT1: 162,
    premiumT2: 198,
    premiumT3: 240,
    ulSl: 24400,
    ulT1: 24600,
    ulT2: 24700,
    maxPainLevel: 24400,
    reasons: ['This is a test email from AI-Trading.', 'If you received this, the mailer is configured correctly.']
  };
  await sendTradeSignalMail(mockRec, 'BUY', 82, recipient);
  return { ok: true, sentTo: recipient };
}

module.exports = {
  getConfig,
  saveConfig,
  sendTest
};
