const bcrypt = require('bcrypt');
const { User, Company, Role, Permission, MultiCompanyModule, UserProfile } = require('../../models');
const logger = require('../../../logger');
const { where: _where } = require('sequelize');
const {
  generateAccessToken,
  generateRefreshToken,
  revokeRefreshToken
} = require('../../utils/startup/authUtils');

const signup = async (username, password, companyId, { phone, name, role }, transaction) => {
  username = username?.trim();
  password = password?.trim();
  logger.info(`Signup attempt: ${phone} - ${name} - ${companyId} - ${role}`);

  const existingUser = await User.findOne({ where: { username } });
  logger.info(`Checking if user already exists: ${username} - Found: ${!!existingUser}`);

  if (existingUser) {
    // Check if user is inactive
    if (!existingUser.isActive) {
      // Update inactive user to active and set is_approved to false
      await existingUser.update({
        isActive: true,
        is_approved: false
      });
      logger.info(`Reactivated existing user: ${phone}`);
      return existingUser;
    } else {
      // User is already active, throw error
      // throw new Error(`Phone number already exists ${phone}.`);
    }
  }

  const company = await Company.findByPk(companyId);
  logger.info(`Looking up company by ID: ${companyId} - Found: ${!!company}`);
  if (!company) {
    throw new Error(`Company not found ${companyId}.`);
  }

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
    companyId,
    roleId: roleInstance ? roleInstance.id : null,
    isActive: true,
    refresh_token: null,
    is_approved: false,
    mobileApp: company.mobileApp,      // inherits from company
    desktopWeb: company.desktopWeb,    // inherits from company
    mobileWeb: company.mobileWeb      // inherits from company
  }, { transaction });
  await UserProfile.create({ userId: user?.dataValues?.id, currentCompany: companyId }, { transaction });
  await MultiCompanyModule.create({ userId: user?.dataValues?.id, companyId }, { transaction });

  return user;
};

const findUserWithRole = async (username) => {
  username = username?.trim();
  return await User.findOne({
    where: { username },
    include: [
      {
        model: Role,
        as: 'role',
        include: [{
          model: Permission,
          as: 'permissions',
          through: { attributes: [] },
          attributes: ['id', 'name', 'description', 'type'] // Explicitly specify attributes that exist
        }]
      }
    ],
    attributes: { exclude: ['refresh_token'] }
  });
};

const validateUserStatusAndPassword = async (user, password, username) => {
  if (!user) {
    logger.warn(`Login failed: User not found: ${username}`);
    throw { status: 401, message: 'User not found' };
  }
  logger.info(`Verifying user password: ${user.id}`);
  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    logger.warn(`Login failed: Invalid password: ${username}`);
    throw { status: 401, message: 'Invalid credentials' };
  }
  if (!user.isActive) {
    logger.warn(`Login failed: Account not found: ${user.id}`);
    throw { status: 403, message: 'Account not found' };
  }
  if (!user.is_approved) {
    logger.warn(`Login failed: Account not approved: ${user.id}`);
    throw { status: 403, message: 'Your account is pending admin approval. Please try again later.' };
  }
  // Check if this is first login (last_active is null)
  if (user.last_active === null) {
    logger.info(`First time login detected: ${user.id} - Password change required`);
    throw { status: 403, message: 'Please change your password', requiresPasswordChange: true };
  }
};

const issueTokensAndPersist = async (user) => {
  const accessToken = generateAccessToken(user);
  logger.info(`Access token generated: ${accessToken}`);
  const refreshToken = await generateRefreshToken(user);
  logger.info(`Refresh token generated: ${refreshToken}`);
  await User.update(
    { refresh_token: refreshToken, last_active: new Date() },
    { where: { id: user.id } }
  );
  return { accessToken, refreshToken };
};

const getActiveCompanyForUser = async (user) => {
  const profile = await UserProfile.findOne({ where: { userId: user.id } });
  const activeCompanyId = profile?.currentCompany || user.companyId;
  if (!activeCompanyId) {
    return null;
  }
  return await Company.findByPk(activeCompanyId, { attributes: ['id', 'name'] });
};

const buildLoginPayload = (user, activeCompany, accessToken, refreshToken) => {
  const userData = user.get({ plain: true });
  delete userData.password;
  delete userData.refresh_token;
  return {
    user: {
      id: userData.id,
      phone: userData.phone,
      username: userData.username,
      name: userData.name,
      isActive: userData.isActive,
      company: activeCompany ? { id: activeCompany.id, name: activeCompany.name } : null,
      isSadmin: userData.isSadmin,
      role: userData.role ? {
        id: userData.role.id,
        name: userData.role.name,
        description: userData.role.description,
        permissions: userData.role.permissions || []
      } : null
    },
    accessToken,
    refreshToken
  };
};

const loginUser = async (credentials) => {
  const { username, password } = credentials;
  const trimmedUsername = username?.trim();
  const trimmedPassword = password?.trim();
  logger.info(`User login attempt: ${trimmedUsername}`);
  logger.info(`Looking up user by username: ${trimmedUsername}`);
  const user = await findUserWithRole(trimmedUsername);
  await validateUserStatusAndPassword(user, trimmedPassword, trimmedUsername);
  logger.info(`User login successful: ${user.id}`);
  const { accessToken, refreshToken } = await issueTokensAndPersist(user);
  const activeCompany = await getActiveCompanyForUser(user);
  return buildLoginPayload(user, activeCompany, accessToken, refreshToken);
};


const approveUser = async (userId) => {
  const user = await User.findByPk(userId);
  if (!user) {
    throw new Error(`User not found ${userId}.`);
  }

  user.is_approved = true;
  await user.save();
};

const resetPassword = async ({ username, password, isFirstLogin }) => {
  username = username?.trim();
  password = password?.trim();
  const user = await User.findOne({ where: { username } });
  if (!user) {
    throw new Error(`User not found ${username}.`);
  }
  const hashedPassword = await bcrypt.hash(password, 10);
  user.password = hashedPassword;
  user.is_approved = false;

  // If this is first login password reset, update last_active to now
  if (isFirstLogin === true) {
    user.last_active = new Date();
    user.is_approved = true;
    logger.info(`First login password reset: ${user.id} - Setting last_active to now`);
  }

  // Revoke all active refresh tokens
  await revokeRefreshToken(user.id);
  await user.save();
  return user;
};

const getCurrentUser = async (userId) => {
  try {
    // Fetch user with associated company
    const user = await User.findByPk(userId, {
      include: [
        {
          model: Role,
          as: 'role',
          include: [{
            model: Permission,
            as: 'permissions',
            through: { attributes: [] },
            attributes: ['id', 'name', 'description', 'type'] // Explicitly specify attributes that exist
          }]
        }
      ]
    });

    if (!user) {
      throw new Error(`User not found ${userId}.`);
    }

    if (!user.isActive) {
      throw new Error(`User account is deactivated ${userId}.`);
    }

    const profile = await UserProfile.findOne({ where: { userId } });
    const activeCompanyId = profile?.currentCompany || user.companyId;
    const activeCompany = activeCompanyId
      ? await Company.findByPk(activeCompanyId, { attributes: ['id', 'name'] })
      : null;

    return {
      id: user.id,
      mobileApp: user.mobileApp,
      desktopWeb: user.desktopWeb,
      mobileWeb: user.mobileWeb,
      phone: user.phone,
      name: user.name,
      companyId: activeCompanyId || null,
      roleId: user.roleId,
      isActive: user.isActive,
      is_approved: user.is_approved,
      company: activeCompany ? { id: activeCompany.id, name: activeCompany.name } : null,
      isSadmin: user.isSadmin,
      role: user.role ? {
        id: user.role.id,
        name: user.role.name,
        description: user.role.description,
        permissions: user.role.permissions || []
      } : null
    };
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      throw new Error(`Invalid or expired token ${userId}.`);
    }
    throw new Error(`Error in getting current user ${userId} ${error.message} ${error.stack}`);
  }
};

const getAllRoles = async () => {
  const roles = await Role.findAll({
    attributes: ['id', 'name', 'description']
  });
  return roles;
};
//  todo : remove the use rservices from here and add them in use servuce.
module.exports = {
  signup,
  loginUser,
  resetPassword,
  approveUser,
  getCurrentUser,
  getAllRoles
};
