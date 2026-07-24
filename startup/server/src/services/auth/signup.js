const bcrypt = require('bcrypt');
const { User, Company, Role, MultiCompanyModule, UserProfile } = require('../../models');
const logger = require('../../../logger');
const { findModelByIdOrThrow } = require('../../utils/modelHelpers');
const { assertPasswordPolicy } = require('./passwordPolicy');

const normalize = (val) => val?.trim().toLowerCase();

const signup = async (username, password, companyId, { phone, name, role, is_approved = false, last_active = null }, transaction) => {
  username = normalize(username);
  password = password?.trim();
  assertPasswordPolicy(password);
  logger.info(`Signup attempt: ${phone} - ${name} - ${companyId} - ${role}`);

  const existingUser = await User.findOne({ where: { username } });
  logger.info(`Checking if user already exists: ${username} - Found: ${!!existingUser}`);

  if (existingUser) {
    if (!existingUser.isActive) {
      await existingUser.update({
        isActive: true,
        is_approved: false
      });
      logger.info(`Reactivated existing user: ${phone}`);
      return existingUser;
    }
    throw new Error(`Username "${username}" already exists`);
  }

  const company = await findModelByIdOrThrow(Company, companyId, { transaction }, 'Company');
  logger.info(`Looking up company by ID: ${companyId} - Found: true`);

  let roleInstance = null;
  if (role) {
    logger.info(`Looking up role information: ${role} - Type: ${typeof role}`);
    // Check if role is a number (ID) or string (name)
    if (typeof role === 'number' || !isNaN(role)) {
      roleInstance = await Role.findByPk(role);
      logger.info(`Role lookup by ID completed: ${role} - Found: ${!!roleInstance}`);
    } else {
      roleInstance = await Role.findOne({ where: { name: role } });
      logger.info(`Role lookup by name completed: ${role} - Found: ${!!roleInstance}`);
    }
    if (!roleInstance) {
      logger.error(`Invalid role specified: ${role}`);
      throw new Error(`Invalid role ${role}.`);
    }
  }
  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await User.create({
    phone,
    username,
    password: hashedPassword,
    name,
    company_id: companyId,
    role_id: roleInstance ? roleInstance.id : null,
    isActive: true,
    refresh_token: null,
    is_approved,
    last_active,
    mobileApp: company.mobileApp,      // inherits from company
    desktopWeb: company.desktopWeb,    // inherits from company
    mobileWeb: company.mobileWeb       // inherits from company
  }, { transaction });
  await UserProfile.create({ userId: user?.dataValues?.id, currentCompany: companyId }, { transaction });
  await MultiCompanyModule.create({ userId: user?.dataValues?.id, companyId }, { transaction });

  return user;
};

module.exports = {
  signup
};
