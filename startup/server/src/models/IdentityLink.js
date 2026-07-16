'use strict';

module.exports = (sequelize, DataTypes) => {
  const IdentityLink = sequelize.define(
    'IdentityLink',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      wallet_account_id: {
        type: DataTypes.UUID,
        allowNull: false,
        unique: true,
        comment: 'OIDC sub = Wallet accounts.id'
      },
      user_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'nbnext_users',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      company_id: {
        type: DataTypes.UUID,
        allowNull: false
      },
      status: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'linked'
      }
    },
    {
      tableName: 'nbnext_identity_links',
      timestamps: true,
      underscored: true,
      indexes: [
        { fields: ['wallet_account_id'], unique: true },
        { fields: ['user_id'] }
      ]
    }
  );

  IdentityLink.associate = (models) => {
    IdentityLink.belongsTo(models.User, {
      foreignKey: 'user_id',
      as: 'user'
    });
  };

  return IdentityLink;
};
