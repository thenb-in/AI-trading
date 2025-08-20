const bcrypt = require('bcrypt');
const { User, Company, Role, Permission } = require('../models');
const logger = require('../logger');
const { where } = require('sequelize');
const { 
  generateAccessToken, 
  generateRefreshToken, 
  revokeRefreshToken 
} = require('../utils/authUtils');

const signup = async ({ phone, username, password, name, companyId, role }) => {
  logger.info('Signup attempt', { phone, name, companyId, role });
  
  const existingUser = await User.findOne({ where: { phone } });
  logger.info('Checking if user already exists', { exists: !!existingUser });
  
  if (existingUser) {
    // Check if user is inactive
    if (!existingUser.isActive) {
      // Update inactive user to active and set is_approved to false
      await existingUser.update({
        isActive: true,
        is_approved: false,
      });
      logger.info('Reactivated existing user', { phone });
      return existingUser;
    } else {
      // User is already active, throw error
      throw new Error('Phone number already exists');
    }
  }

  const company = await Company.findByPk(companyId);
  logger.info('Looking up company by ID', { companyId, companyFound: !!company });
  if (!company) {
    throw new Error('Company not found');
  }

  let roleInstance = null;
  if (role) {
    logger.info('Looking up role information', { role, roleType: typeof role });
    // Check if role is a number (ID) or string (name)
    if (typeof role === 'number' || !isNaN(role)) {
      roleInstance = await Role.findByPk(role);
      logger.info('Role lookup by ID completed', { roleId: role, roleFound: !!roleInstance });
    } else {
      roleInstance = await Role.findOne({ where: { name: role } });
      logger.info('Role lookup by name completed', { roleName: role, roleFound: !!roleInstance });
    }
    if (!roleInstance) {
      logger.error('Invalid role specified', { role });
      throw new Error('Invalid role');
    }
  }
  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await User.create({
    phone,
    username,
    password: hashedPassword,
    name,
    companyId,
    roleId: roleInstance? roleInstance.id : null,
    isActive: true,
    refresh_token: null,
    is_approved: false,
    mobileApp: company.mobileApp,      // inherits from company
    desktopWeb: company.desktopWeb,    // inherits from company
    mobileWeb: company.mobileWeb,      // inherits from company
  });
  return user;
};

const loginUser = async (credentials) => {
  const { username, password } = credentials;
  logger.info('User login attempt', { username });

  // Fetch user with relations including role and permissions
  logger.info('Looking up user by username', { username });
  const user = await User.findOne({
    where: { username },
    include: [
      { 
        model: Company, 
        as: 'company',
        attributes: ['id', 'name']
      },
      { 
        model: Role, 
        as: 'role',
        include: [{
          model: Permission,
          as: 'permissions',
          through: { attributes: [] }, // Exclude join table attributes
          attributes: ['id', 'name', 'description']
        }]
      }
    ],
    attributes: {
      exclude: ['refresh_token'] // Exclude sensitive fields
    }
  });
  if (!user) {
    logger.warn('Login failed: User not found', { username });
    throw { status: 401, message: "User not found" };
  }

  logger.info('Verifying user password', { userId: user.id });
  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    logger.warn('Login failed: Invalid password', { username });
    throw { status: 401, message: "Invalid credentials" };
  }

  if (!user.isActive) {
    logger.warn('Login failed: Account not found', { userId: user.id });
    throw {
      status: 403, 
      message: "Account not found" 
    };
  }

  if (!user.is_approved) {
    logger.warn('Login failed: Account not approved', { userId: user.id });
    throw {
      status: 403,
      message: "Your account is pending admin approval. Please try again later.",
    };
  }
  
  logger.info('User login successful', { userId: user.id });

  // Generate tokens using utility functions
const accessToken = generateAccessToken(user);
logger.info('Access token generated', { accessToken });


const refreshToken = await generateRefreshToken(user);
logger.info('Refresh token generated', { refreshToken });

// Update user with refresh token
  await User.update(
    { refresh_token: refreshToken, last_active: new Date() },
    { where: { id: user.id } }
  );
  // Prepare user data for response
  const userData = user.get({ plain: true });
  
  // Remove sensitive data
  delete userData.password;
  delete userData.refresh_token;

  // Structure the response
  return { 
    user: {
      id: userData.id,
      phone: userData.phone,
      username: userData.username,
      name: userData.name,
      isActive: userData.isActive,
      company: userData.company,
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

const resetPassword = async ({ username, password }) => {
  const user = await User.findOne({ where: { username } });
  if (!user) {
    throw new Error('User not found');
  }
  const hashedPassword = await bcrypt.hash(password, 10);
  user.password = hashedPassword;
  user.is_approved = false;
  // Revoke all active refresh tokens
  await revokeRefreshToken(user.id);
  await user.save();
  return user;
};

const approveUser = async (userId) => {
  const user = await User.findByPk(userId);
  if (!user) {
    throw new Error('User not found');
  }

  user.is_approved = true;
  await user.save();
};

const getAllUsers = async () => {
  const users = await User.findAll({
    where: { isActive: true },
    attributes: ['id', 'phone', 'name', 'companyId', 'isActive', 'last_active', 'is_approved' ,'mobileApp','desktopWeb','mobileWeb' ],
    include: [
      { model: Company, as: 'company', attributes: ['name'] },
      { model: Role, as: 'role', attributes: ['name'] }
    ],
    order: [['last_active', 'DESC']]
  });

   // Fetch all roles separately
  const roles = await Role.findAll({
    attributes: ['id', 'name'],
    order: [['name', 'ASC']]
  });
  
  return { users, roles  };
};

const getUserById = async (userId) => {
  const user = await User.findByPk(userId);
  if (!user) {
    throw new Error('User not found');
  }
  return user;
};

const getCurrentUser = async (userId) => {
  try {
    // Fetch user with associated company
    const user = await User.findByPk(userId, {
      include: [
        {
          model: Company,
          as: 'company',
          attributes: ['id', 'name']
        },
        {
          model: Role,
          as: 'role',
          include: [{
            model: Permission,
            as: 'permissions',
            through: { attributes: [] },
            attributes: ['id', 'name', 'description']
          }]
        }
      ]
    });

    if (!user) {
      throw new Error('User not found');
    }

    if (!user.isActive) {
      throw new Error('User account is deactivated');
    }

    return {
      id: user.id,
      mobileApp: user.mobileApp,
      desktopWeb: user.desktopWeb,
      mobileWeb: user.mobileWeb,
      phone: user.phone,
      name: user.name,
      companyId: user.companyId,
      roleId: user.roleId,
      isActive: user.isActive,
      is_approved: user.is_approved,
      company: user.company,
      
      role: user.role ? {
        id: user.role.id,
        name: user.role.name,
        description: user.role.description,
        permissions: user.role.permissions || []
      } : null
    };
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      throw new Error('Invalid or expired token');
    }
    throw error;
  }
};

const getAllRoles = async () => {
  const roles = await Role.findAll({
    attributes: ['id', 'name', 'description'],
  });
  return roles;
};
//  todo : remove the use rservices from here and add them in use servuce.
module.exports = {
  signup,
  loginUser,
  resetPassword,
  approveUser,
  getAllUsers,
  getUserById,
  getCurrentUser,
  getAllRoles,
};