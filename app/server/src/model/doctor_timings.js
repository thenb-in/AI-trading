module.exports = (sequelize, DataTypes) => {
  const DoctorTimings = sequelize.define(
    'DoctorTimings',
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
          model: 'doctor',
          key: 'id'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      },
      day: {
        type: DataTypes.STRING(20),
        allowNull: false
      },
      start_time: {
        type: DataTypes.TIME,
        allowNull: false
      },
      end_time: {
        type: DataTypes.TIME,
        allowNull: false
      }
    },
    {
      schema: 'public',
      timestamps: false
    }
  );

  DoctorTimings.associate = (models) => {
    DoctorTimings.belongsTo(models.Doctor, {
      foreignKey: 'doctor_id',
      as: 'doctor'
    });
  };

  return DoctorTimings;
};
