const { Op: _Op } = require('sequelize');
// User is the primary model for this service
// UserProfile is tightly coupled with User (one-to-one relationship)
const { User, UserProfile } = require('../models');
const { findModelByIdOrThrow } = require('../utils/modelHelpers');
const roleService = require('./roleService');

/**
 * Permanently deletes a user and their profile from the database.
 * @param {string|number} userId - ID of the user to delete
 * @returns {Promise<void>}
 * @side_effects Destroys UserProfile and User rows; cascaded associations cleaned by DB constraints
 */
async function deleteUser(userId) {
  // Delete user profile - UserProfile is imported for includes, use directly here
  await UserProfile.destroy({ where: { userId: userId } });

  // Delete multi-company module associations is cascaded by DB foreign key constraint
  // Finally, delete the user
  await User.destroy({ where: { id: userId } });
}

/**
 * Updates a user's assigned role after validating the role exists for the user's company.
 * @param {string|number} userId - User ID
 * @param {number|null} newRoleId - New role ID, or null to unassign
 * @returns {Promise<void>}
 * @throws {Error} If user or role not found
 */
async function updateUserRole(userId, newRoleId) {
  const user = await findModelByIdOrThrow(User, userId, {}, 'User');

  // Allow null roleId (no role assigned)
  if (newRoleId) {
    // Use adminService to validate role exists
    const roles = await roleService.getAllRoles(user.company_id);
    const roleExists = roles.some(r => r.id === newRoleId);
    if (!roleExists) {
      throw new Error(`Role not found ${newRoleId}.`);
    }
    user.role_id = newRoleId;
  } else {
    user.role_id = null;
  }

  await user.save();
}

/**
 * Updates a user's device access flags (desktop web, mobile web, mobile app).
 * Only updates fields present in the payload.
 * @param {string|number} userId - User ID
 * @param {Object} deviceAccess - Partial device flags to update
 * @param {boolean} [deviceAccess.desktopWeb] - Desktop web access
 * @param {boolean} [deviceAccess.mobileWeb] - Mobile web access
 * @param {boolean} [deviceAccess.mobileApp] - Mobile app access
 * @returns {Promise<Object>} Updated User instance
 * @throws {Error} If user not found
 */
async function updateUserDeviceAccess(userId, deviceAccess) {
  const user = await findModelByIdOrThrow(User, userId, {}, 'User');

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

/**
 * Retrieves a user by primary key. Throws if not found.
 * @param {string|number} userId - User ID
 * @returns {Promise<Object>} User model instance
 * @throws {Error} If user not found
 */
const getUserById = async (userId) => {
  return await findModelByIdOrThrow(User, userId, {}, 'User');
};

/**
 * Retrieves all active users for a given company, ordered by last_active descending.
 * Includes the user's profile via eager loading.
 * @param {string} companyId - Company ID to filter by
 * @returns {Promise<Array<Object>>} Array of User model instances with userProfile
 */
const getAllUsers = async (companyId) => {
  const users = await User.findAll({
    where: { isActive: true, company_id: companyId },
    attributes: ['id', 'phone', 'name', 'company_id', 'isActive', 'last_active', 'is_approved', 'mobileApp', 'desktopWeb', 'mobileWeb', 'username', 'role_id'],
    include: [
      { model: UserProfile, as: 'userProfile', required: false }
    ],
    order: [['last_active', 'DESC']]
  });
  return users;
};

/**
 * Updates both the User's company_id and the UserProfile's currentCompany to the given company.
 * @param {string|number} userId - User ID
 * @param {string} companyId - New company ID to set
 * @returns {Promise<Object>} Updated User instance
 * @side_effects Updates both User and UserProfile tables
 */
async function updateUserCurrentCompany(userId, companyId) {
  // Update user's company_id
  const user = await findModelByIdOrThrow(User, userId, {}, 'User');
  user.company_id = companyId;
  await user.save();
  // Update UserProfile currentCompany
  await UserProfile.update(
    { currentCompany: companyId },
    { where: { userId } }
  );
  return user;
}

/**
 * Creates or updates a user's profile. If the profile exists, it is updated; otherwise a new one is created.
 * @param {string|number} userId - User ID
 * @param {Object} userProfile - Profile fields to set
 * @returns {Promise<Object>} Updated User instance with userProfile included
 * @throws {Error} If user not found or update fails
 */
const updateUserProfile = async (userId, userProfile) => {
  // UserProfile is imported for includes
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

/**
 * Stores a new refresh token and updates the last_active timestamp for a user.
 * @param {string|number} userId - User ID
 * @param {string} refreshToken - New refresh token to persist
 * @returns {Promise<boolean>} True if the update affected at least one row
 */
const updateUserRefreshTokenAndLastActive = async (userId, refreshToken) => {
  const [updated] = await User.update(
    { refresh_token: refreshToken, last_active: new Date() },
    { where: { id: userId }, returning: true }
  );

  return updated > 0;
};

/**
 * Checks whether a user is approved (used by auth middleware to gate access).
 * @param {string|number} userId - User ID
 * @returns {Promise<{ isActive: boolean, user: Object|null }>} Active status and user reference
 */
const checkUserActive = async (userId) => {
  const user = await User.findByPk(userId, {
    attributes: ['is_approved', 'username']
  });
  if (!user || !user.is_approved) {
    return { isActive: false, user };
  }
  return { isActive: true, user };
};

/**
 * Fetches a user by primary key with optional row-level locking for transaction safety.
 * Used during refresh token rotation to prevent race conditions.
 * @param {string|number} userId - User ID
 * @param {Object} options - Query options
 * @param {Array<string>} [options.attributes] - Columns to select
 * @param {Object} [options.lock] - Sequelize lock type (e.g., transaction.LOCK.UPDATE)
 * @param {Object} [options.transaction] - Sequelize transaction instance
 * @returns {Promise<Object|null>} User instance or null
 */
const getUserByPkWithLock = async (userId, options = {}) => {
  const { attributes, lock, transaction } = options;
  const queryOptions = {
    attributes: attributes || ['id', 'isActive', 'refresh_token', 'company_id', 'username'],
    ...(lock && { lock }),
    ...(transaction && { transaction })
  };

  return await User.findByPk(userId, queryOptions);
};

/**
 * Updates a user's refresh token and last_active within an existing transaction.
 * @param {string|number} userId - User ID
 * @param {string} refreshToken - New refresh token value
 * @param {Object} transaction - Active Sequelize transaction
 * @returns {Promise<Object>} Updated User instance
 * @throws {Error} If user not found
 */
const updateUserRefreshToken = async (userId, refreshToken, transaction) => {
  const user = await findModelByIdOrThrow(User, userId, { transaction }, 'User');

  user.refresh_token = refreshToken;
  user.last_active = new Date();
  await user.save({ transaction });
  return user;
};

/**
 * Revokes a user's refresh token by setting it to null in the database.
 * @param {string|number} userId - User ID
 * @returns {Promise<boolean>} True if revocation affected at least one row
 */
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

/**
 * Atomically rotates a user's refresh token within a database transaction with row-level locking.
 * Validates the current token matches before rotating to prevent replay attacks.
 * @param {string|number} userId - User ID
 * @param {string} currentRefreshToken - Token the client presented (must match DB)
 * @param {string} newRefreshToken - New token to store
 * @param {string|null} companyId - Company ID for context
 * @returns {Promise<{ id: number, company_id: string, username: string }>} User summary
 * @throws {Error} If user not found, inactive, or token mismatch
 */
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

/**
 * Fetches a user's profile record.
 * @param {string|number} userId - User ID
 * @returns {Promise<Object|null>} UserProfile instance or null if not found
 */
const getUserProfile = async (userId) => {
  // UserProfile is imported for includes
  return await UserProfile.findOne({ where: { userId } });
};

/**
 * Creates a new UserProfile record for a user.
 * @param {string|number} userId - User ID to create the profile for
 * @param {Object} data - Additional profile data (e.g., currentCompany)
 * @param {Object|null} transaction - Optional Sequelize transaction
 * @returns {Promise<Object>} Created UserProfile instance
 */
const createUserProfile = async (userId, data = {}, transaction = null) => {
  // UserProfile is imported for includes
  const options = transaction ? { transaction } : {};
  return await UserProfile.create({
    userId,
    ...data
  }, options);
};

module.exports = {
  getUserById,
  deleteUser,
  updateUserRole,
  updateUserDeviceAccess,
  updateUserProfile,
  updateUserRefreshTokenAndLastActive,
  checkUserActive,
  getUserByPkWithLock,
  updateUserRefreshToken,
  revokeRefreshToken,
  getAllUsers,
  handleRefreshTokenRotation,
  getUserProfile,
  createUserProfile,
  updateUserCurrentCompany
};
