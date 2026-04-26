const { Op } = require('sequelize');
const { Role } = require('../models');

async function getAllRoles(companyId) {
  const roles = await Role.findAll(
    {
      where: {
        [Op.or]: [
          { companyId: null }, // Global/default roles (visible to all users)
          { companyId: companyId } // Company-specific roles
        ]
      }
    });
  return roles;
}

module.exports = {
  getAllRoles
};
