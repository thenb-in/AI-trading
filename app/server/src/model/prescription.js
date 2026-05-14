module.exports = (sequelize, DataTypes) => {
  const Prescription = sequelize.define(
    'Prescription',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      doctor_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'Doctors',
          key: 'id'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      },
      notes: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      date: {
        type: DataTypes.DATE,
        allowNull: false
      },
      medicine_intake: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      next_follow_up: {
        type: DataTypes.DATEONLY,
        allowNull: true
      },
      created_by: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      updated_by: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      company_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'nbnext_company',
          key: 'id'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      }
    },
    {
      schema: 'public',
      timestamps: true // includes created_at and updated_at
    }
  );

  Prescription.associate = (models) => {
    Prescription.belongsTo(models.Doctor, {
      foreignKey: 'doctor_id',
      as: 'doctor'
    });
    Prescription.belongsTo(models.Company, {
      foreignKey: 'company_id',
      as: 'company'
    });
  };

  return Prescription;
};
