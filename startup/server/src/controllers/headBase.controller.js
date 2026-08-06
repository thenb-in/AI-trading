const logger = require('../../logger');
const headBaseService = require('../services/headBaseService');

/**
 * Rebuild this company's head history in the wallet.
 *
 * The company comes from the session, not the body: an operator rebuilds the
 * company they are logged into, and accepting one in the payload would let a
 * request restate somebody else's usage.
 */
const buildHeadBase = async (req, res) => {
  try {
    const summary = await headBaseService.build({
      companyId: req.user.company_id,
      months: req.body?.months,
      createdBy: req.user.id
    });

    res.json({ success: true, data: summary });
  } catch (error) {
    logger.error('Error building head base', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { buildHeadBase };
