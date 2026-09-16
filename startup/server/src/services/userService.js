const { Op } = require('sequelize');
// User is the primary model for this service
// UserProfile is tightly coupled with User (one-to-one relationship)
const db = require('../models');
const { sequelize, User, UserProfile, Company, Role, Permission, MultiCompanyModule } = db;
const { findModelByIdOrThrow } = require('../utils/modelHelpers');
const { runOnUserUpdate } = require('../hooks/onUserUpdate');
const { normalizeEmail } = require('../utils/normalizeUtils');
const logger = require('../../logger');

async function deleteUser(userId) {
  // Delete user profile
  await UserProfile.destroy({ where: { userId: userId } });

  // Delete multi-company module associations if they exist
  await db.MultiCompanyModule.destroy({ where: { user_id: userId } });

  // Finally, delete the user
  await db.User.destroy({ where: { id: userId } });
}

async function updateUserRole(userId, newRoleId) {
  const user = await findModelByIdOrThrow(db.User, userId, {}, 'User');

  // Allow null role_id (no role assigned)
  if (newRoleId) {
    await findModelByIdOrThrow(db.Role, newRoleId, {}, 'Role');
    user.role_id = newRoleId;
  } else {
    user.role_id = null;
  }

  await user.save();
}

async function updateUserDeviceAccess(userId, deviceAccess) {
  const user = await findModelByIdOrThrow(db.User, userId, {}, 'User');

  // Update only fields present in the payload
  if (deviceAccess.desktopWeb !== undefined) {
    user.desktopWeb = !!deviceAccess.desktopWeb;
  }
  if (deviceAccess.mobileWeb !== undefined) {
    user.mobileWeb = !!deviceAccess.mobileWeb;
  }
  if (deviceAccess.mobileApp !== undefined) {
    user.mobileApp = !!deviceAccess.mobileApp;
  }

  await user.save();
  return user;
}



const getAllUsers = async (companyId) => {
  if (!companyId) {
    throw new Error(`Company ID is required ${companyId}.`);
  }
  const rows = await User.findAll({
    where: { isActive: true, company_id: companyId },
    attributes: ['id', 'phone', 'name', 'company_id', 'isActive', 'last_active', 'is_approved', 'mobileApp', 'desktopWeb', 'mobileWeb', 'username', 'email', 'wallet_user_id'],
    include: [
      { model: Company, as: 'company', attributes: ['name'] },
      // description is what tells an admin what a role like `company_admin`
      // actually grants — the screens that pick roles all want to show it.
      { model: Role, as: 'role', attributes: ['id', 'name', 'description'] },
      { model: UserProfile, as: 'userProfile', required: false }
    ],
    order: [['last_active', 'DESC']]
  });

  const users = rows.map((row) => {
    const { wallet_user_id: walletUserId, ...user } = row.toJSON();
    return { ...user, isSso: Boolean(walletUserId) };
  });

  // Fetch all roles separately - get global roles (companyId is null) and company-specific roles

  const roles = await Role.findAll({
    where: {
      [Op.or]: [
        { company_id: null }, // Global roles
        { company_id: companyId } // Company-specific roles
      ]
    },
    attributes: ['id', 'name', 'description'],
    order: [['name', 'ASC']]
  });

  return { users, roles };
};

const getUserById = async (userId) => {
  return await findModelByIdOrThrow(User, userId, {}, 'User');
};

/** Whether the given user is a support (superadmin) user. */
const isSupportUser = async (userId) => {
  const user = await findModelByIdOrThrow(User, userId, { attributes: ['isSupportUser'] }, 'User');
  return !!user.isSupportUser;
};

/** Display names for a set of user ids, keyed by id as a string. */
const getUserNamesByIds = async (ids) => {
  const wanted = [...new Set((ids || []).filter(Boolean).map(String))];
  if (!wanted.length) {
    return new Map();
  }
  const users = await User.findAll({
    attributes: ['id', 'name'],
    where: { id: { [Op.in]: wanted } },
    raw: true
  });
  return new Map(users.map((user) => [String(user.id), user.name]));
};

const getActiveUserIdsByRoleName = async (companyId, roleName, { excludeUserId = null } = {}) => {
  const users = await User.findAll({
    where: { company_id: companyId, isActive: true },
    include: [{ model: Role, as: 'role', where: { name: roleName }, attributes: [] }],
    attributes: ['id']
  });

  return users
    .map((user) => user.id)
    .filter((id) => id !== excludeUserId);
};

/** Active support users, with the company each sits in. */
const getSupportUsers = async () => User.findAll({
  where: { isSupportUser: true, isActive: true },
  attributes: ['id', 'name', 'username'],
  include: [{ model: Company, as: 'company', attributes: ['id', 'name'] }],
  order: [['name', 'ASC']]
});

const getActiveUserIdsByPermissionName = async (companyId, permissionName, { excludeUserId = null } = {}) => {
  if (!companyId || !permissionName) {
    return [];
  }

  const linkedUserIds = await MultiCompanyModule.findAll({
    where: { companyId },
    attributes: ['userId']
  }).then((links) => links.map((link) => link.userId));

  const companyScope = [{ company_id: companyId }];
  if (linkedUserIds.length > 0) {
    companyScope.push({ id: { [Op.in]: linkedUserIds } });
  }

  const users = await User.findAll({
    where: {
      isActive: true,
      is_approved: true,
      [Op.or]: companyScope
    },
    include: [{
      model: Role,
      as: 'role',
      required: true,
      include: [{
        model: Permission,
        as: 'permissions',
        where: { name: permissionName },
        attributes: [],
        through: { attributes: [] },
        required: true
      }]
    }],
    attributes: ['id']
  });

  return users
    .map((user) => user.id)
    .filter((id) => id !== excludeUserId);
};

const getUserByUsername = async (username, transaction) => {
  return User.findOne({ where: { username }, transaction });
};

/** The local account for a Wallet user, by their OIDC `sub`. Null if none. */
const getUserByWalletUserId = async (walletUserId) => {
  if (!walletUserId) {
    return null;
  }
  return User.findOne({ where: { wallet_user_id: walletUserId } });
};

const updateUserProfile = async (userId, userProfile) => {
  const user = await findModelByIdOrThrow(User, userId, {
    include: [
      { model: UserProfile, as: 'userProfile', required: false }
    ]
  }, 'User');

  try {
    if (user.userProfile) {
      // UserProfile exists, update it
      await user.userProfile.update(userProfile);
    } else {
      // UserProfile doesn't exist, create it
      await UserProfile.create({
        userId: user.id,
        currentCompany: user.company_id,
        ...userProfile
      });
    }

    // Reload user with updated userProfile
    const updatedUser = await User.findByPk(userId, {
      include: [
        { model: UserProfile, as: 'userProfile', required: false }
      ]
    });

    return updatedUser;
  } catch (error) {
    throw new Error(`Error updating user profile: ${error.message}`);
  }
};

const updateUserRefreshTokenAndLastActive = async (userId, refreshToken) => {
  const [updated] = await User.update(
    {
      refresh_token: refreshToken,
      last_active: new Date(),
      tokens_valid_after: null
    },
    { where: { id: userId }, returning: true }
  );

  return updated > 0;
};


const ALLOWED_BASIC_FIELDS = ['name', 'phone', 'username', 'email'];

const updateUserBasic = async (userId, fields = {}) => {
  const user = await findModelByIdOrThrow(User, userId, {}, 'User');
  const previousUsername = user.username;

  const updates = {};
  for (const key of ALLOWED_BASIC_FIELDS) {
    if (fields[key] !== undefined) {
      updates[key] = typeof fields[key] === 'string' ? fields[key].trim() : fields[key];
    }
  }

  if (updates.username !== undefined) {
    const normalized = updates.username.toLowerCase();
    if (!normalized) {
      throw new Error(`Username cannot be empty get ${normalized}`);
    }
    const clash = await User.findOne({ where: { username: normalized, id: { [Op.ne]: userId } } });
    if (clash) {
      throw new Error(`Username "${normalized}" already exists`);
    }
    updates.username = normalized;
  }

  if (updates.email) {
    const normalized = normalizeEmail(updates.email);
    if (!normalized) {
      throw new Error(`"${updates.email}" is not an email address`);
    }
    updates.email = normalized;
  }

  if (Object.keys(updates).length > 0) {
    await user.update(updates);
    await user.reload();
  }

  await runOnUserUpdate({ user, previousUsername, fields });

  return user;
};

const checkUserActive = async (userId) => {
  const user = await User.findByPk(userId, {
    attributes: ['id', 'is_approved', 'username', 'wallet_user_id']
  });
  if (!user || !user.is_approved) {
    return { isActive: false, user };
  }
  return { isActive: true, user };
};


const createSsoUser = async ({ username, name, phone = null, companyId, walletUserId }) => {
  const company = await findModelByIdOrThrow(Company, companyId, {}, 'Company');

  return sequelize.transaction(async (transaction) => {
    const user = await User.create({
      username,
      name,
      phone,
      password: null,
      company_id: companyId,
      wallet_user_id: walletUserId,
      isActive: true,
      is_approved: true,
      refresh_token: null,
      mobileApp: company.mobileApp,
      desktopWeb: company.desktopWeb,
      mobileWeb: company.mobileWeb
    }, { transaction });

    await UserProfile.create({
      userId: user.id,
      currentCompany: companyId
    }, { transaction });

    await MultiCompanyModule.create({
      userId: user.id,
      companyId
    }, { transaction });

    return user;
  });
};

/**
 * End every session this user currently holds.
 */
const invalidateSessions = async (userId) => {
  await User.update(
    { tokens_valid_after: new Date(), refresh_token: null },
    { where: { id: userId } }
  );
};

const setUserApproved = async (userId, approved) => {
  const user = await findModelByIdOrThrow(User, userId, {}, 'User');
  if (user.is_approved === approved) {
    return false;
  }

  await user.update({ is_approved: approved });
  if (!approved) {
    await invalidateSessions(userId);
  }
  logger.info(`User ${user.username} is now ${approved ? 'approved' : 'not approved'}`);
  return true;
};

const getTokensValidAfter = async (userId) => {
  const user = await User.findByPk(userId, {
    attributes: ['tokens_valid_after']
  });
  return user?.tokens_valid_after || null;
};

const getUserByPkWithLock = async (userId, options = {}) => {
  const { attributes, lock, transaction } = options;
  const queryOptions = {
    attributes: attributes || ['id', 'isActive', 'refresh_token', 'company_id', 'username'],
    ...(lock && { lock }),
    ...(transaction && { transaction })
  };

  return await User.findByPk(userId, queryOptions);
};

const updateUserRefreshToken = async (userId, refreshToken, transaction) => {
  const user = await findModelByIdOrThrow(User, userId, { transaction }, 'User');

  user.refresh_token = refreshToken;
  user.last_active = new Date();
  await user.save({ transaction });
  return user;
};

const revokeRefreshToken = async (userId) => {
  const [updated] = await User.update(
    { refresh_token: null },
    {
      where: { id: userId },
      returning: true
    }
  );

  return updated > 0;
};

const handleRefreshTokenRotation = async (userId, currentRefreshToken, newRefreshToken, companyId) => {
  const tx = await User.sequelize.transaction();
  try {
    const user = await findModelByIdOrThrow(User, userId, {
      attributes: ['id', 'isActive', 'refresh_token', 'company_id', 'username'],
      lock: tx.LOCK.UPDATE,
      transaction: tx
    }, 'User');

    if (!user.isActive) {
      await tx.rollback();
      throw new Error(`User inactive ${user.username || userId}`);
    }

    // If stored refresh token doesn't match the presented one, it was rotated earlier
    if (user.refresh_token !== currentRefreshToken) {
      await tx.rollback();
      throw new Error(`Invalid or rotated refresh token for user ${user.username || userId}`);
    }

    // Rotate token
    user.refresh_token = newRefreshToken;
    user.last_active = new Date();
    await user.save({ transaction: tx });
    await tx.commit();

    return {
      id: user.id,
      company_id: companyId || user.company_id,
      username: user.username
    };
  } catch (error) {
    if (!tx.finished) {
      await tx.rollback();
    }
    throw error;
  }
};

module.exports = {
  getAllUsers,
  getSupportUsers,
  getUserById,
  getUserNamesByIds,
  isSupportUser,
  getActiveUserIdsByRoleName,
  getActiveUserIdsByPermissionName,
  getUserByUsername,
  getUserByWalletUserId,
  deleteUser,
  updateUserRole,
  updateUserDeviceAccess,
  updateUserProfile,
  updateUserBasic,
  updateUserRefreshTokenAndLastActive,
  checkUserActive,
  createSsoUser,
  setUserApproved,
  invalidateSessions,
  getTokensValidAfter,
  getUserByPkWithLock,
  updateUserRefreshToken,
  revokeRefreshToken,
  handleRefreshTokenRotation
};
