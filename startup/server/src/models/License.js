'use strict';

// Local cached copy of the license + seal. The signed token + seal file
// on disk are the authoritative defense; this table mirrors them so we
// can survive a missing/corrupt file (DB read falls back), and so the
// status endpoint + UI can render details without re-verifying every
// query.
//
// Exactly ONE active row is expected (singleton). If multiple rows exist,
// the most recently `updated_at` row wins; older rows are dead state from
// prior installs.

module.exports = (sequelize, DataTypes) => {
  const License = sequelize.define('License', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    licenseId: {
      type: DataTypes.UUID,
      allowNull: false,
      unique: true,
      field: 'license_id'
    },
    customerId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'customer_id'
    },
    appName: {
      type: DataTypes.STRING,
      allowNull: false,
      field: 'app_name'
    },
    machineFingerprint: {
      type: DataTypes.STRING(128),
      allowNull: false,
      field: 'machine_fingerprint'
    },
    serial: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    // Per-plan grant mirrored from the token: [{ id, name, permissions: [...] }].
    plan: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: []
    },
    notBefore: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'not_before'
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'expires_at'
    },
    renewalAfter: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'renewal_after'
    },
    renewalMode: {
      type: DataTypes.ENUM('online', 'airgap', 'manual'),
      allowNull: false,
      defaultValue: 'online',
      field: 'renewal_mode'
    },
    token: {
      type: DataTypes.TEXT,
      allowNull: false,
      comment: 'The most recently accepted signed license token, verbatim.'
    },
    sealAnchorToken: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'seal_anchor_token',
      comment: 'DB-side mirror of the seal file. Verified the same way.'
    },
    sealHighestSerial: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'seal_highest_serial'
    },
    sealLastWallclock: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'seal_last_wallclock'
    },
    lastVerifiedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'last_verified_at'
    },
    lastRenewalAttemptAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'last_renewal_attempt_at'
    },
    lastRenewalError: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'last_renewal_error'
    }
  }, {
    tableName: 'nbnext_license_local',
    timestamps: true,
    underscored: true,
    indexes: [
      { unique: true, fields: ['license_id'] },
      { fields: ['expires_at'] }
    ]
  });

  return License;
};
