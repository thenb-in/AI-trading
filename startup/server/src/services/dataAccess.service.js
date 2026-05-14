const logger = require('../../logger');
const { DataAccess } = require('../models');

async function getUserDataAccess(userId, companyId) {
  const existing = await DataAccess.findOne({ where: { userId, companyId } });
  if (!existing) {
    return { level: 'company', scope: { departmentIds: [], employeeIds: [] } };
  }
  return { level: existing.level, scope: existing.scope };
}

async function setUserDataAccess({ userId, companyId, level, scope }) {
  const validLevels = ['company', 'department', 'employee'];
  if (!validLevels.includes(level)) {
    throw new Error(`Invalid data access level ${level}. Valid levels are: ${validLevels.join(', ')}`);
  }
  // normalize and deduplicate
  const deptIds = Array.isArray(scope?.departmentIds)
    ? scope.departmentIds.map(Number).filter(Number.isFinite).map((v) => Math.trunc(v))
    : [];
  const empIds = Array.isArray(scope?.employeeIds)
    ? scope.employeeIds.map(String)
    : [];

  let normalizedScope = {
    departmentIds: Array.from(new Set(deptIds)),
    employeeIds: Array.from(new Set(empIds))
  };

  // enforce level-specific scope
  if (level === 'company') {
    normalizedScope = { departmentIds: [], employeeIds: [] };
  } else if (level === 'department') {
    normalizedScope.employeeIds = [];
  } else if (level === 'employee') {
    normalizedScope.departmentIds = [];
  }

  const [record, created] = await DataAccess.findOrCreate({
    where: { userId, companyId },
    defaults: { level, scope: normalizedScope }
  });

  if (!created) {
    record.level = level;
    record.scope = normalizedScope;
    await record.save();
  }
  logger.info(`Data access set for user ${userId} at level ${level}`);
  return { level: record.level, scope: record.scope };
}

async function getAllowedDataAccess(user_id) {
  try {
    const access = await DataAccess.findOne({ where: { user_id } });

    if (!access) {
      return null;
    }

    let details = {};

    if (access.level === 'company') {
      details = { level: 'company', accessTo: 'Entire company data' };
    } else if (access.level === 'department') {
      details = {
        level: 'department',
        department_id: access.scope?.departmentIds || []
      };
    } else if (access.level === 'employee') {
      details = {
        level: 'employee',
        employee_id: access.scope?.employeeIds || []
      };
    }

    return { user_id, ...details };
  } catch (error) {
    logger.info(`Error fetching allowed data access: ${error.message} - stack: ${error.stack}`);
    throw error;
  }
}

module.exports = {
  getUserDataAccess,
  setUserDataAccess,
  getAllowedDataAccess
};


