// Registers this app's columns onto the startup models
const { registerModelFields } = require('@startup/src/models/register/modelFieldRegistry');
const { companyProfileFields } = require('../mixins/companyProfileFields');
const { userProfileFields } = require('../mixins/userProfileFields');
const { companyProfileTradingFields } = require('../mixins/companyProfileTradingFields');

registerModelFields('CompanyProfile', companyProfileFields);
registerModelFields('UserProfile', userProfileFields);
registerModelFields('CompanyProfile', companyProfileTradingFields);
