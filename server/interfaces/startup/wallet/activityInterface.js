const axios = require('axios');
const logger = require('../../../logger');
const env = require('../../../src/config/env');


/**
 * Push activity to external server
 */
async function pushActivityToExternalServer(activityData) {
  try {
    const externalServerUrl = env.WALLET_SERVER_URL;

    if (!externalServerUrl) {
      throw new Error(`externalServerUrl is not defined ,externalServerUrl is :${externalServerUrl}`);
    }
    const pushUrl = `${externalServerUrl}/activity/push`;
    logger.info(`Pushing activity to external server: ${pushUrl}`);

    const response = await axios.post(pushUrl, activityData, {
      timeout: 10000, // 10 seconds timeout
      headers: {
        'Content-Type': 'application/json'
      }
    });

    logger.info(`Activity successfully pushed to external server. Status: ${response.status}`);
    return {
      success: true,
      status: response.status,
      message: response.data?.message,
      insufficientWallet: response.data?.insufficientWallet
    };
  } catch (error) {
    logger.error(`Error pushing activity to external server: ${error.message}`, error);

    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      const errorMessage = `External server responded with status ${error.response.status}: ${error.response.data?.message || error.message}`;
      throw new Error(errorMessage);
    } else if (error.request) {
      // The request was made but no response was received
      const errorMessage = `No response from external server: ${error.message}`;
      throw new Error(errorMessage);
    } else if (error.code === 'ECONNABORTED') {
      // Request timeout
      const errorMessage = `Request timeout while pushing activity to external server: ${error.message}`;
      throw new Error(errorMessage);
    } else {
      // Something happened in setting up the request that triggered an Error
      const errorMessage = `Failed to push activity to external server: ${error.message}`;
      throw new Error(errorMessage);
    }
  }
}

module.exports = {
  pushActivityToExternalServer
};

