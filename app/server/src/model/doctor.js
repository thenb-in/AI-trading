module.exports = (sequelize, DataTypes) => {
  const Doctor = sequelize.define(
    'Doctor',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
            alias: {
                type: DataTypes.STRING(50),
                allowNull: false
            },
      type:
      {
            type: DataTypes.STRING(50),
            allowNull: false
        },
      mobile_number: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      email: {
        type: DataTypes.STRING(100),
        allowNull: true
      },
      adress: {
        type: DataTypes.STRING(255),
        allowNull: true
      },
      alternate_number: {
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
      },
    },
    {
      schema: 'public',
      timestamps: false // assuming no created_at / updated_at
    }
  );

  Doctor.associate = (models) => {
    Doctor.belongsTo(models.Company, {
      foreignKey: 'company_id',
      as: 'company'
    });
  };

  return Doctor;
};
