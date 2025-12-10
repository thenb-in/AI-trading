const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Layout = sequelize.define(
    'Layout',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      document_name: {
        type: DataTypes.STRING(255),
        allowNull: false,
        validate: {
          notEmpty: true
        }
      },
      layout_name: {
        type: DataTypes.STRING(255),
        allowNull: false,
        validate: {
          notEmpty: true
        }
      },
      type: {
        type: DataTypes.ENUM('public', 'private', 'temp'),
        allowNull: false,
        defaultValue: 'private'
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
      company_id: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'company_id',
        references: {
          model: 'nbnext_company',
          key: 'id'
        }
      },
      column_config: {
        type: DataTypes.JSONB,
        allowNull: false
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
      tableName: 'nbnext_layouts',
      modelName: 'Layout',
      timestamps: false,
      freezeTableName: true,
      indexes: [
        {
          fields: ['document_name']
        },
        {
          fields: ['user_id']
        },
        {
          fields: ['company_id']
        },
        {
          fields: ['type']
        },
        {
          fields: ['created_at']
        }
      ]
    }
  );

  Layout.associate = (models) => {
    // A Layout belongs to a User (owner)
    Layout.belongsTo(models.User, {
      foreignKey: 'user_id',
      as: 'user'
    });

    // A Layout belongs to a Company
    Layout.belongsTo(models.Company, {
      foreignKey: 'company_id',
      as: 'company'
    });
  };

  // Instance methods
  Layout.prototype.toJSON = function() {
    const values = Object.assign({}, this.get());
    return values;
  };

  // Class methods
  Layout.findByDocumentAndUserId = function(documentName, userId, companyId) {
    return this.findAll({
      where: {
        document_name: documentName,
        user_id: userId,
        company_id: companyId
      },
      order: [['created_at', 'DESC']]
    });
  };

  Layout.findPublicByDocument = function(documentName, companyId) {
    return this.findAll({
      where: {
        document_name: documentName,
        type: 'public',
        company_id: companyId
      },
      order: [['created_at', 'DESC']]
    });
  };


  return Layout;
};
