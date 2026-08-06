const axios = require('axios');
const logger = require('../../logger');
const env = require('../../src/config/env');
const { ACTIVITY_ERRORS, WALLET_INGEST_PREFIX } = require('../../src/constants/activity');


/**
 * The heads the wallet has any use for, for this company.
 *
 * Asked rather than assumed. A head is just a string this app puts on an
 * activity, and it puts one on every master it logs — twenty-two of them — of
 * which the wallet prices or caps a handful. The rest was bandwidth here and
 * storage there with no reader at either end. The wallet derives its answer
 * from what it actually acts on (charge rules, deliberate head limits), so
 * pricing a new head starts the traffic with no release on this side.
 *
 * Throws on failure. The caller decides what a missing answer means; see
 * walletHeadsService, which treats it as "send anyway".
 */
async function fetchTrackedHeadsFromExternalServer(companyId) {
  const externalServerUrl = env.WALLET_SERVER_URL;

  if (!externalServerUrl) {
    throw new Error(`externalServerUrl is not defined ,externalServerUrl is :${externalServerUrl}`);
  }

  const response = await axios.get(`${externalServerUrl}${WALLET_INGEST_PREFIX}/activity/heads`, {
    params: companyId ? { companyId } : {},
    timeout: 10000
  });

  const heads = response.data?.heads;
  if (!Array.isArray(heads)) {
    throw new Error(ACTIVITY_ERRORS.WALLET_NO_HEAD_LIST);
  }
  return heads;
}

/**
 * Push a run of activities in one request.
 *
 * What a headbase sends. One company's history is thousands of activities, and
 * a round trip each would take minutes of waiting to say something we already
 * knew in full. The wallet posts each one on its own terms and answers with
 * counts, so a head limit reached partway through is reported rather than
 * failing the lot.
 */
async function pushActivitiesToExternalServer(activities, { rebuildUsage = false } = {}) {
  const externalServerUrl = env.WALLET_SERVER_URL;

  if (!externalServerUrl) {
    throw new Error(`externalServerUrl is not defined ,externalServerUrl is :${externalServerUrl}`);
  }

  const response = await axios.post(
    `${externalServerUrl}${WALLET_INGEST_PREFIX}/activity/push-batch`,
    { activities, rebuildUsage },
    { timeout: 120000, headers: { 'Content-Type': 'application/json' } }
  );

  logger.info(`Pushed ${activities.length} activities in one batch. Status: ${response.status}`);
  return response.data || {};
}

/**
 * Push activity to external server
 */
async function pushActivityToExternalServer(activityData) {
  try {
    const externalServerUrl = env.WALLET_SERVER_URL;

    if (!externalServerUrl) {
      throw new Error(`externalServerUrl is not defined ,externalServerUrl is :${externalServerUrl}`);
    }
    const pushUrl = `${externalServerUrl}${WALLET_INGEST_PREFIX}/activity/push`;
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
  fetchTrackedHeadsFromExternalServer,
  pushActivitiesToExternalServer,
  pushActivityToExternalServer
};

