'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('nbnext_iclock_transaction', 'punch_direction', {
      type: Sequelize.SMALLINT,
      allowNull: true
    });
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn('nbnext_iclock_transaction', 'punch_direction');
  }
};
