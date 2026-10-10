// View layer: owns req/res, input validation and status codes. Response/error
// shapes preserved exactly from the legacy source (see FINDINGS).
const logger = require('@startup/logger');
const mailerController = require('../controllers/mailerController');

function getMailerConfigView(_req, res) {
  res.json({ success: true, data: mailerController.getConfig() });
}

async function saveMailerConfigView(req, res) {
  const { secretKey } = req.body;
  if (typeof secretKey !== 'string') {
    return res.status(400).json({ success: false, error: 'Provide secretKey (string)' });
  }
  try {
    res.json({ success: true, data: await mailerController.saveConfig(secretKey) });
  } catch (err) {
    logger.error(`[Mailer] config save failed: ${err.message}`);
    res.status(500).json({ success: false, error: 'Failed to persist mailer config', message: err.message });
  }
}

async function sendTestMailView(_req, res) {
  try {
    res.json({ success: true, data: await mailerController.sendTest() });
  } catch (err) {
    if (err.statusCode === 400) {
      return res.status(400).json({ success: false, error: err.message });
    }
    res.status(502).json({ success: false, error: 'Test mail failed', message: err.message });
  }
}

module.exports = {
  getMailerConfigView,
  saveMailerConfigView,
  sendTestMailView
};
