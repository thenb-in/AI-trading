const { getAllowedDataAccess } = require('../services/dataAccess.service');
const logger = require('../../logger');

async function allowedDataAccess(userId) {
  try {
    if (!userId) {
      throw new Error(`User ID ${userId} is required`);
    }
    const accessData = await getAllowedDataAccess(userId);

    if (!accessData) {
      throw new Error(`No data access defined for user: ${userId}`);
    }

    return accessData;
  } catch (error) {
    logger.error(`Error in allowedDataAccess util for user ${userId || 'unknown'}`, error);
    throw error;
  }
}

module.exports = allowedDataAccess;
