const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const UserDefaultLayout = sequelize.define(
    'UserDefaultLayout',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      user_id: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'user_id',
        references: {
          model: 'nbnext_users',
          key: 'id'
        }
      },
      document_name: {
        type: DataTypes.STRING(255),
        allowNull: false,
        validate: {
          notEmpty: true
        }
      },
      layout_id: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'layout_id',
        references: {
          model: 'nbnext_layouts',
          key: 'id'
        }
      },
      company_id: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'company_id',
        references: {
          model: 'nbnext_company',
          key: 'id'
        }
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      }
    },
    {
      tableName: 'nbnext_user_default_layouts',
      modelName: 'UserDefaultLayout',
      timestamps: false,
      freezeTableName: true,
      indexes: [
        {
          unique: true,
          fields: ['user_id', 'document_name', 'company_id'],
          name: 'unique_user_document_company_default'
        },
        {
          fields: ['user_id']
        },
        {
          fields: ['document_name']
        },
        {
          fields: ['layout_id']
        },
        {
          fields: ['company_id']
        }
      ]
    }
  );

  UserDefaultLayout.associate = (models) => {
    // A UserDefaultLayout belongs to a User
    UserDefaultLayout.belongsTo(models.User, {
      foreignKey: 'user_id',
      as: 'user'
    });

    // A UserDefaultLayout belongs to a Layout
    UserDefaultLayout.belongsTo(models.Layout, {
      foreignKey: 'layout_id',
      as: 'layout'
    });

    // A UserDefaultLayout belongs to a Company
    UserDefaultLayout.belongsTo(models.Company, {
      foreignKey: 'company_id',
      as: 'company'
    });
  };

  // Instance methods
  UserDefaultLayout.prototype.toJSON = function() {
    const values = Object.assign({}, this.get());
    return values;
  };

  // Class methods
  UserDefaultLayout.findByUserAndDocument = function(userId, documentName, companyId) {
    return this.findOne({
      where: {
        user_id: userId,
        document_name: documentName,
        company_id: companyId
      }
    });
  };

  UserDefaultLayout.findByUser = function(userId, companyId) {
    return this.findAll({
      where: {
        user_id: userId,
        company_id: companyId
      }
    });
  };

  return UserDefaultLayout;
};

