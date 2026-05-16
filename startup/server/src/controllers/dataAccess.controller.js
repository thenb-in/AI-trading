const logger = require('../../logger');
const dataAccessService = require('../services/dataAccess.service');

exports.getUserDataAccess = async (req, res) => {
  try {
    const { userId } = req.params;
    const companyId = req.user.company_id;
    const result = await dataAccessService.getUserDataAccess(userId, companyId);
    res.status(200).json(result);
  } catch (error) {
    logger.error('getUserDataAccess error', error);
    res.status(500).json({ message: error.message });
  }
};

exports.setUserDataAccess = async (req, res) => {
  try {
    const { userId, level, scope } = req.body;
    const companyId = req.user.company_id;
    const result = await dataAccessService.setUserDataAccess({ userId, companyId, level, scope });
    res.status(200).json(result);
  } catch (error) {
    logger.error('setUserDataAccess error', error);
    res.status(400).json({ message: error.message});
  }
};


