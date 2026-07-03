const path = require('path');
const { CompanyDetails, Company } = require('../models');
const logger = require('../../logger');
const env = require('../config/env');
const nbnextDriveService = require('./nbnextDriveService');
const { COMPANY_DETAILS_OBJECT_NAME } = require('../constants/companyDetails');


const COMPANY_DETAILS_FIELDS = [
  'company_email', 'phone', 'alternate_phone', 'address', 'district',
  'company_gstin', 'pan_no',
  'bank_account_holder_name', 'bank_account_number', 'bank_name', 'bank_ifsc_code', 'bank_branch_name',
  'epf_no', 'sac_code'
];

const pick = (obj, keys) => keys.reduce((acc, k) => {
  if (obj[k] !== undefined) {
    acc[k] = obj[k] === '' ? null : obj[k];
  }
  return acc;
}, {});

const buildLogoUrl = (filePath) => filePath ? `/uploads/${String(filePath).replace(/^\/+/, '')}` : null;

const saveLogo = async (file, companyId, userId) => {
  return nbnextDriveService.createFile({
    fileName: file.originalname,
    filePath: path.relative(env.UPLOADS_DIR, file.path).replace(/\\/g, '/'),
    fileSize: file.size,
    mimeType: file.mimetype,
    objectName: COMPANY_DETAILS_OBJECT_NAME,
    objectId: String(companyId)
  }, userId, companyId);
};

const removeLogos = async (companyId) => {
  const existing = await nbnextDriveService.getFilesByObject(companyId, COMPANY_DETAILS_OBJECT_NAME, String(companyId));
  for (const file of existing) {
    await nbnextDriveService.deleteFile(Number(file.id), companyId, null, true);
  }
};

const getLogoUrl = async (companyId) => {
  const files = await nbnextDriveService.getFilesByObject(companyId, COMPANY_DETAILS_OBJECT_NAME, String(companyId));
  return files.length ? buildLogoUrl(files[0].filePath) : null;
};

const getCompanyDetails = async (companyId) => {
  const row = await CompanyDetails.findOne({
    where: { companyId },
    include: [{ model: Company, as: 'company', attributes: ['name'] }]
  });
  const data = row ? row.toJSON() : { companyId };
  // entity_name is the company's name (not stored on company_details).
  data.entity_name = data.company?.name || null;
  delete data.company;
  data.company_logo = await getLogoUrl(companyId);
  return data;
};

const upsertCompanyDetails = async (companyId, payload, userId = null, logoFile = null) => {
  const values = pick(payload, COMPANY_DETAILS_FIELDS);

  const existing = await CompanyDetails.findOne({ where: { companyId } });
  if (existing) {
    if (Object.keys(values).length) {
      await existing.update(values);
    }
  } else {
    await CompanyDetails.create({ companyId, ...values });
  }

  if (logoFile) {
    try {
      await removeLogos(companyId);
      await saveLogo(logoFile, companyId, userId);
    } catch (logoError) {
      logger.error(`Failed to save company logo for company=${companyId}: ${logoError.message}`, logoError);
    }
  }

  return getCompanyDetails(companyId);
};

module.exports = {
  getCompanyDetails,
  upsertCompanyDetails,
  getLogoUrl
};
