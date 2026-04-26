const fs = require('fs');
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');
const logger = require('../../../logger');
const env = require('../../../src/config/env');
const {
  prepareTempFolder,
  moveUploadedFileToTemp,
  cleanupTempFiles
} = require('../../common/image_utils');

const createTicketInterface = async (payload) => {
  const tempFilePaths = [];
  try {
    const externalServerUrl = env.WALLET_SERVER_URL;
    if (!externalServerUrl) {
      throw new Error(`WALLET_SERVER_URL is not configured  ,externalServerUrl : ${externalServerUrl} `);
    }

    const submitUrl = `${externalServerUrl}/ticket/submit`;
    logger.info(`[HELP_SUPPORT_TICKET][INTERFACE] Submitting ticket to wallet API: ${submitUrl}`);

    const form = new FormData();
    Object.entries(payload || {}).forEach(([key, value]) => {
      if (key === 'attachments') {
        return;
      }
      if (value === undefined || value === null) {
        return;
      }
      form.append(key, typeof value === 'string' ? value : String(value));
    });

    const attachments = Array.isArray(payload?.attachments) ? payload.attachments : [];
    if (attachments.length > 0) {
      const tempDir = await prepareTempFolder('temp/help-support');
      for (const file of attachments) {
        if (!file?.path) {
          continue;
        }
        const { filePath } = await moveUploadedFileToTemp(file, tempDir, {
          prefix: 'help_support_',
          defaultExtension: path.extname(file.originalname || '') || '.bin',
          subFolder: 'temp/help-support'
        });
        tempFilePaths.push(filePath);
        form.append('attachments', fs.createReadStream(filePath), {
          filename: file.originalname || path.basename(filePath),
          contentType: file.mimetype || 'application/octet-stream'
        });
      }
    }

    const response = await axios.post(submitUrl, form, {
      timeout: 10000,
      headers: form.getHeaders()
    });

    return {
      success: true,
      status: response.status,
      message: response.data?.message,
      data: response.data
    };
  } catch (error) {
    logger.error(`[HELP_SUPPORT_TICKET][INTERFACE] Wallet API submit failed: ${error.message}`, error);
    if (error.response) {
      throw new Error(`Wallet API error ${error.response.status}: ${error.response.data?.error || error.message}`);
    }
    if (error.request) {
      throw new Error(`Wallet API did not respond: ${error.error}`);
    }
    throw new Error(`Failed to submit ticket to wallet API: ${error.error}`);
  } finally {
    await cleanupTempFiles(tempFilePaths);
  }
};

module.exports = {
  createTicketInterface
};
