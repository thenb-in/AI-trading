// View layer: owns req/res and the { success, data } envelope only.
const logger = require('@startup/logger');
const companyProfileTradingController = require('../controllers/companyProfileTradingController');

async function getTradingConfigView(req, res) {
  try {
    const companyId = req.user.company_id;
    const data = await companyProfileTradingController.getTradingConfig(companyId);
    res.json({ success: true, data });
  } catch (error) {
    logger.error(`Error reading company trading config for company=${req.user?.company_id}: ${error.message}`);
    res.status(400).json({ error: error.message });
  }
}

async function updateTradingConfigView(req, res) {
  try {
    const companyId = req.user.company_id;
    const data = await companyProfileTradingController.updateTradingConfig(companyId, req.body);
    res.json({ success: true, data });
  } catch (error) {
    logger.error(`Error updating company trading config for company=${req.user?.company_id}: ${error.message}`);
    res.status(400).json({ error: error.message });
  }
}

module.exports = {
  getTradingConfigView,
  updateTradingConfigView
};
