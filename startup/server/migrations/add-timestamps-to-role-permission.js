'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('RolePermission', 'createdAt', {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
    });

    await queryInterface.addColumn('RolePermission', 'updatedAt', {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('RolePermission', 'createdAt');
    await queryInterface.removeColumn('RolePermission', 'updatedAt');
  }
};
