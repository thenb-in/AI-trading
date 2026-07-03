const logger = require('../../logger');
const companyDetailsController = require('../controllers/companyDetailsController');

async function getCompanyDetailsView(req, res) {
  try {
    const companyId = req.user.company_id;
    const data = await companyDetailsController.getCompanyDetails(companyId);
    res.json({ success: true, data });
  } catch (error) {
    logger.error('Error in getCompanyDetails view', error);
    res.status(400).json({ error: error.message });
  }
}

async function upsertCompanyDetailsView(req, res) {
  try {
    const companyId = req.user.company_id;
    const userId = req.user.id;
    const data = await companyDetailsController.upsertCompanyDetails(
      companyId,
      req.body,
      userId,
      req.file || null
    );
    res.json({ success: true, data });
  } catch (error) {
    logger.error('Error in upsertCompanyDetails view', error);
    res.status(400).json({ error: error.message });
  }
}

module.exports = {
  getCompanyDetailsView,
  upsertCompanyDetailsView
};
