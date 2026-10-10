// View layer: owns req/res, input validation and the response shape.
//
// Response/error shapes are preserved exactly from the legacy source (raw
// archive result on success; { error, message } on failure) so existing
// clients are unaffected — see FINDINGS in the migration notes.
const archiveController = require('../controllers/archiveController');
const { getZerodhaErrorMessage } = require('@appServer/interfaces/broker');

const ARCHIVE_SYMBOLS = ['NIFTY', 'BANKNIFTY', 'SENSEX'];

async function getStatusView(_req, res) {
  try {
    res.json({ success: true, data: await archiveController.getStatus() });
  } catch (err) {
    res.status(500).json({ success: false, error: `Archive status failed`, message: getZerodhaErrorMessage(err) });
  }
}

async function archiveIndexView(req, res) {
  try {
    const symbol = ARCHIVE_SYMBOLS.includes(req.query.symbol) ? req.query.symbol : 'NIFTY';
    const days = Math.min(Math.max(parseInt(req.query.days, 10) || 400, 1), 3000);
    res.json({ success: true, data: await archiveController.archiveIndex(symbol, days) });
  } catch (err) {
    res.status(502).json({ success: false, error: 'Index archive failed', message: getZerodhaErrorMessage(err) });
  }
}

async function archiveOptionsView(req, res) {
  try {
    const symbol = req.query.symbol === 'BANKNIFTY' ? 'BANKNIFTY' : 'NIFTY';
    res.json({ success: true, data: await archiveController.archiveOptions(symbol) });
  } catch (err) {
    res.status(502).json({ success: false, error: `Options archive failed`, message: getZerodhaErrorMessage(err) });
  }
}

module.exports = {
  getStatusView,
  archiveIndexView,
  archiveOptionsView
};
