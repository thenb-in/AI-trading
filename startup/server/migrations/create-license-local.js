'use strict';

// Creates the `nbnext_license_local` table on the framework (verifier)
// side. This is the on-host cached copy of the signed license token plus
// the local anti-rollback seal. See `src/models/License.js` for field
// docs and `src/license/licenseSeal.js` for seal semantics.
//
// First-time installs typically pick this table up via SYNC_DB sync;
// production environments that ship without SYNC_DB run this migration.

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('nbnext_license_local', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      license_id: { type: Sequelize.UUID, allowNull: false, unique: true },
      customer_id: { type: Sequelize.UUID, allowNull: false },
      app_name: { type: Sequelize.STRING, allowNull: false },
      machine_fingerprint: { type: Sequelize.STRING(128), allowNull: false },
      serial: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      subscription_id: { type: Sequelize.INTEGER, allowNull: true },
      permissions: { type: Sequelize.JSONB, allowNull: false, defaultValue: [] },
      permission_caps: { type: Sequelize.JSONB, allowNull: false, defaultValue: {} },
      not_before: { type: Sequelize.DATE, allowNull: false },
      expires_at: { type: Sequelize.DATE, allowNull: false },
      renewal_after: { type: Sequelize.DATE, allowNull: true },
      renewal_mode: {
        type: Sequelize.ENUM('online', 'airgap', 'manual'),
        allowNull: false,
        defaultValue: 'online',
      },
      token: { type: Sequelize.TEXT, allowNull: false },
      seal_anchor_token: { type: Sequelize.TEXT, allowNull: true },
      seal_highest_serial: {
        type: Sequelize.INTEGER, allowNull: false, defaultValue: 0,
      },
      seal_last_wallclock: { type: Sequelize.DATE, allowNull: true },
      last_verified_at: { type: Sequelize.DATE, allowNull: true },
      last_renewal_attempt_at: { type: Sequelize.DATE, allowNull: true },
      last_renewal_error: { type: Sequelize.TEXT, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
    await queryInterface.addIndex('nbnext_license_local', ['expires_at']);
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('nbnext_license_local');
  },
};
