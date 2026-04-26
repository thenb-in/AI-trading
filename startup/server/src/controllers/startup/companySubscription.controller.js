const logger = require('../../../logger');
const companySubscriptionService = require('../../services/startup/companySubscription.service');


/**
 * Get subscriptions for a specific company
 */
const getCompanySubscriptions = async (req, res) => {
  try {
    const { companyId } = req.params;

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: `Company ID is required get :${companyId}`
      });
    }

    const subscriptions = await companySubscriptionService.getCompanySubscriptions(companyId);

    res.json({
      success: true,
      data: subscriptions
    });
  } catch (error) {
    logger.error('Error fetching company subscriptions', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Get all available subscriptions (global + company-specific)
 */
const getAvailableSubscriptions = async (req, res) => {
  try {
    const companyId = req.user.company_id;
    const subscriptions = await companySubscriptionService.getAvailableSubscriptions(companyId);

    res.json({
      success: true,
      data: subscriptions
    });
  } catch (error) {
    logger.error('Error fetching available subscriptions', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Set subscriptions for a company (replace existing)
 */
const setCompanySubscriptions = async (req, res) => {
  try {
    const { companyId } = req.params;
    const { subscriptionIds } = req.body;
    const userId = req.user.id;

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: `Company ID is required get :${companyId}`
      });
    }

    if (!Array.isArray(subscriptionIds)) {
      return res.status(400).json({
        success: false,
        message: `subscriptionIds must be an array get : ${typeof subscriptionIds}`
      });
    }

    const result = await companySubscriptionService.setCompanySubscriptions(
      companyId,
      subscriptionIds,
      userId
    );

    res.json({
      success: true,
      message: `Successfully updated subscriptions for company with id :${companyId}`,
      data: result
    });
  } catch (error) {
    logger.error('Error setting company subscriptions', error);
    const statusCode = error.status || 400;
    res.status(statusCode).json({
      success: false,
      message: error.message
    });
  }
};

module.exports = {
  getCompanySubscriptions,
  getAvailableSubscriptions,
  setCompanySubscriptions
};

