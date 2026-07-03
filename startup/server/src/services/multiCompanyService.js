const logger = require('../../logger');
// MultiCompanyModule is the primary model for this service
const { MultiCompanyModule, CompanyProfile } = require('../models');
const companyService = require('./companyService');
const rolePermissionService = require('./rolePermissionService');
const userService = require('./userService');

/**
 * Retrieves all companies a user is linked to via MultiCompanyModule.
 * @param {string|number} userId - User ID
 * @returns {Promise<Array<{ id: string, name: string }>>} List of company summaries
 * @notes Performs N+1 queries (one per company link); see TODO for optimization
 */
async function getUserCompanies(userId) {
  // MultiCompanyModule is imported for operations
  // Fetch links and then get companies through companyService
  const links = await MultiCompanyModule.findAll({
    where: { userId },
    order: [['createdAt', 'ASC']]
  });

  // Get companies through companyService
  const companies = [];
  for (const link of links) {
    try {
      const company = await companyService.getCompanySettings(link.companyId);
      companies.push({
        id: company.id,
        name: company.name
      });
    } catch (error) {
      // Company might not exist, skip
      logger.error(`Company ${link.companyId} not found, skipping`, error);
    }
  }
  return companies;
}

/**
 * Switches a user's active company. Validates the link exists, updates company_id,
 * syncs device access settings from the new company, and returns the updated user.
 * @param {string|number} userId - User ID
 * @param {string} companyId - Target company ID to switch to
 * @returns {Promise<Object>} Updated user object with company info
 * @throws {Error} If user is not linked to the company or is inactive
 * @side_effects Updates User.company_id, UserProfile.currentCompany, and device access flags
 */
async function switchUserCompany(userId, companyId) {
  // Use userService and companyService functions
  // Ensure the user is linked to the company
  const link = await findUserCompanyLink(userId, companyId);
  if (!link) {
    throw new Error(`You are not linked to this company ${companyId}.`);
  }

  const company = await companyService.getCompanySettings(companyId);
  const user = await userService.getUserById(userId);

  if (!user.isActive) {
    throw new Error(`Invalid or inactive user ${userId}.`);
  }

  // Update user's company and device access - use userService
  await userService.updateUserDeviceAccess(userId, {
    mobileApp: company.mobileApp,
    desktopWeb: company.desktopWeb,
    mobileWeb: company.mobileWeb
  });
  // Update user's company_id and UserProfile
  await userService.updateUserCurrentCompany(userId, companyId);
  const updatedUser = await userService.getUserById(userId);
  return {
    ...updatedUser.toJSON(),
    company: {
      id: company.id,
      name: company.name
    }
  };
}

/**
 * Creates a MultiCompanyModule link between a user and a company.
 * @param {string|number} userId - User ID
 * @param {string} companyId - Company ID
 * @param {Object|null} transaction - Optional Sequelize transaction
 * @returns {Promise<void>}
 */
async function assignUserToCompany(userId, companyId, transaction = null) {
  await MultiCompanyModule.create(
    { userId, companyId },
    { transaction }
  );
}

/**
 * Finds an existing user-company link in MultiCompanyModule.
 * @param {string|number} userId - User ID
 * @param {string} companyId - Company ID
 * @returns {Promise<Object|null>} Link record or null
 */
async function findUserCompanyLink(userId, companyId) {
  return await MultiCompanyModule.findOne({ where: { userId, companyId } });
}

/**
 * Removes all MultiCompanyModule associations for a user.
 * @param {string|number} userId - User ID
 * @returns {Promise<void>}
 */
async function removeAllUserCompanyLinks(userId) {
  // Remove all MultiCompanyModule associations for a user
  await MultiCompanyModule.destroy({ where: { user_id: userId } });
}

async function getCompanyUsers(companyId) {
  // Fetch assignments and then get users through userService
  const assignments = await MultiCompanyModule.findAll({
    where: { companyId },
    order: [['createdAt', 'ASC']]
  });

  // Get users through userService and filter for support user and active
  const users = [];
  for (const assignment of assignments) {
    try {
      const user = await userService.getUserById(assignment.userId);
      if (user.isSupportUser && user.isActive) {
        users.push({
          id: user.id,
          name: user.name,
          username: user.username,
          isSupportUser: user.isSupportUser,
          isActive: user.isActive
        });
      }
    } catch (error) {
      // User might not exist, skip
      logger.error(`User ${assignment.userId} not found, skipping`, error);
    }
  }
  return users;
}


const assignUserToCompanyFinal = async (userId, companyId) => {
  try {
    // Validate user exists and is support user and active - use userService
    const user = await userService.getUserById(userId);

    if (!user.isSupportUser || !user.isActive) {
      throw { status: 400, message: 'Only active support users can be assigned to companies' };
    }

    // Validate company exists - use companyService
    const company = await companyService.getCompanySettings(companyId);

    // MultiCompanyModule operations should use multiCompanyService
    const existingAssignment = await findUserCompanyLink(userId, companyId);

    if (existingAssignment) {
      throw { status: 409, message: 'User is already assigned to this company' };
    }

    // Create the assignment using multiCompanyService
    await assignUserToCompany(userId, companyId);

    logger.info(`User ${userId} assigned to company ${companyId}`);
    return {
      message: `User "${user.name}" successfully assigned to company "${company.name}"`,
      user,
      company
    };
  } catch (error) {
    logger.error('Error assigning user to company', error);
    throw error;
  }
};

const removeUserFromCompanyFinal = async (userId, companyId) => {
  try {
    // Validate user exists - use userService
    const user = await userService.getUserById(userId);

    // Validate company exists - use companyService
    const company = await companyService.getCompanySettings(companyId);

    // MultiCompanyModule operations should use multiCompanyService
    const assignment = await removeUserFromCompany(userId, companyId);

    if (!assignment) {
      throw { status: 404, message: 'User is not assigned to this company' };
    }

    logger.info(`User ${userId} removed from company ${companyId}`);
    return {
      message: `User "${user.name}" successfully removed from company "${company.name}"`,
      user,
      company
    };
  } catch (error) {
    logger.error('Error removing user from company', error);
    throw error;
  }
};

async function removeUserFromCompany(userId, companyId) {
  const assignment = await MultiCompanyModule.findOne({
    where: { userId, companyId }
  });
  if (assignment) {
    await assignment.destroy();
  }
  return assignment;
}


/**
 * Fetches all users for a company, enriched with company info and role details.
 * @param {string} companyId - Company ID
 * @returns {Promise<{ users: Array<Object>, roles: Array<{ id: number, name: string }> }>}
 * @throws {Error} If companyId is missing
 */
async function getAllUsers(companyId) {
  if (!companyId) {
    throw new Error(`Company ID is required ${companyId}.`);
  }
  // Fetch users with UserProfile only (avoid Company and Role includes)
  const users = await userService.getAllUsers(companyId);

  // Fetch company and roles separately through service functions
  const company = await companyService.getCompanySettings(companyId);
  const allRoles = await rolePermissionService.getRolesAndPermissions(companyId);
  const roles = allRoles.map(role => ({ id: role.id, name: role.name }));

  // Add company and role data to each user
  const usersWithRelations = users.map(user => {
    const userJson = user.toJSON();
    // Get role_id - Sequelize converts snake_case to camelCase in toJSON()
    // So role_id becomes roleId, but we check both to be safe
    // Also check the raw model dataValues which has the original column name
    const roleId = userJson.roleId || user.dataValues?.role_id || user.role_id || null;
    const userRole = roleId ? allRoles.find(r => r.id === roleId) : null;
    return {
      ...userJson,
      company: { name: company.name },
      role: userRole ? { id: userRole.id, name: userRole.name } : null
    };
  });

  return { users: usersWithRelations, roles };
}

/**
 * Creates a new company, its profile, and links the creating user to it — all within a transaction.
 * @param {Object} data - Company creation data
 * @param {string} data.name - Company name
 * @param {string|null} data.companyId - Custom company ID (auto-generated if null)
 * @param {boolean} data.mobileApp - Mobile app access flag
 * @param {boolean} data.desktopWeb - Desktop web access flag
 * @param {boolean} data.mobileWeb - Mobile web access flag
 * @param {string|number} userId - User ID of the creator
 * @returns {Promise<Object>} Created Company model instance
 * @throws {Error} If company ID is already taken or creation fails
 * @side_effects Creates Company, CompanyProfile, and MultiCompanyModule records
 */
async function createCompanyAndLink(data, userId) {
  // CompanyProfile and MultiCompanyModule are part of Company operations
  const transaction = await MultiCompanyModule.sequelize.transaction();
  try {
    // Check if companyId already exists (only if provided)
    if (data.companyId && data.companyId.trim()) {
      const existingCompany = await companyService.existingCompany(data.companyId,  transaction );
      if (existingCompany) {
        throw new Error(`Company ID "${data.companyId}" is already taken. Please choose a different ID.`);
      }
    }

    // Build company data - only include id if companyId is provided
    const companyData = {
      name: data.name,
      mobileApp: !!data.mobileApp,
      desktopWeb: data.desktopWeb === undefined ? true : !!data.desktopWeb,
      mobileWeb: !!data.mobileWeb
    };

    // Only set id if companyId is provided and not empty
    if (data.companyId && data.companyId.trim()) {
      companyData.id = data.companyId.trim();
    }
    // Otherwise, let Sequelize auto-generate UUID via defaultValue: DataTypes.UUIDV4

    const company = await companyService.createCompany(companyData, transaction);
    await CompanyProfile.create({ companyId: company.id }, { transaction });

    // Link user to company
    await assignUserToCompany(userId, company.id, transaction);

    await transaction.commit();
    return company;
  } catch (error) {
    if (!transaction.finished) {
      await transaction.rollback();
    }
    throw new Error(`Failed to create company: ${error.message}`);
  }
}

module.exports = {
  getUserCompanies,
  switchUserCompany,
  assignUserToCompany,
  findUserCompanyLink,
  removeAllUserCompanyLinks,
  getCompanyUsers,
  removeUserFromCompany,
  getAllUsers,
  createCompanyAndLink,
  assignUserToCompanyFinal,
  removeUserFromCompanyFinal
};
