const logger = require('../../../logger');
// MultiCompanyModule is the primary model for this service
const { MultiCompanyModule } = require('../../models');
const companyProfileService = require('../companyProfileService');
const companyService = require('./companyService');
const rolePermissionService = require('./rolePermissionService');
const userService = require('./userService');

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

async function assignUserToCompany(userId, companyId, transaction = null) {
  await MultiCompanyModule.create(
    { userId, companyId },
    { transaction }
  );
}

async function findUserCompanyLink(userId, companyId) {
  return await MultiCompanyModule.findOne({ where: { userId, companyId } });
}

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

  // Get users through userService and filter for sadmin and active
  const users = [];
  for (const assignment of assignments) {
    try {
      const user = await userService.getUserById(assignment.userId);
      if (user.isSadmin && user.isActive) {
        users.push({
          id: user.id,
          name: user.name,
          username: user.username,
          isSadmin: user.isSadmin,
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

async function removeUserFromCompany(userId, companyId) {
  const assignment = await MultiCompanyModule.findOne({
    where: { userId, companyId }
  });
  if (assignment) {
    await assignment.destroy();
  }
  return assignment;
}

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

async function createCompanyAndLink(data, userId) {
  // CompanyProfile and MultiCompanyModule are part of Company operations
  const transaction = await MultiCompanyModule.sequelize.transaction();
  try {
    // Check if companyId already exists
    if (data.companyId) {
      const existingCompany = await companyService.getCompanySettings(data.companyId, { transaction });
      if (existingCompany) {
        throw new Error(`Company ID "${data.companyId}" is already taken. Please choose a different ID.`);
      }
    }

    const company = await companyService.createCompany(
      {
        name: data.name,
        id: data.companyId,
        mobileApp: !!data.mobileApp,
        desktopWeb: data.desktopWeb === undefined ? true : !!data.desktopWeb,
        mobileWeb: !!data.mobileWeb
      },
      { transaction }
    );

    await companyProfileService.createCompanyProfile(company.id, {}, transaction);

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
  createCompanyAndLink
};
