module.exports = (sequelize, DataTypes) => {
  const ReportRun = sequelize.define('ReportRun', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    // Tenant scope — the company this run belongs to.
    companyId: {
      type: DataTypes.UUID,
      allowNull: false
    },
    // Who asked for it. Runs are listed per-user, not per-company.
    userId: {
      type: DataTypes.UUID,
      allowNull: false
    },
    // Registry slug, e.g. 'detailed-attendance-report'.
    reportKey: {
      type: DataTypes.STRING(120),
      allowNull: false
    },
    reportTitle: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    // Exactly what was sent. Re-opening a run seeds the filter bar from this.
    filters: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {}
    },
    status: {
      type: DataTypes.STRING(16),
      allowNull: false,
      defaultValue: 'queued'
    },
    // 'frontend' | 'cron' — who asked for the run.
    source: {
      type: DataTypes.STRING(16),
      allowNull: false,
      defaultValue: 'frontend'
    },
    // The gzipped { columns, data } payload, held in NBnext Drive. The rows are
    // deliberately not a column here — see the table comment in
    // db-scripts/20260802_09_create_report_run.sql. Drive owns the path, the
    // size and the deletion; this row only points at it.
    driveFileId: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    rowCount: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    columnCount: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    errorMessage: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    startedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    finishedAt: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    tableName: 'nbnext_report_run',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['company_id', 'user_id', 'created_at'] },
      { fields: ['status'] },
      { fields: ['created_at'] }
    ]
  });

  ReportRun.associate = (models) => {
    ReportRun.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
    ReportRun.belongsTo(models.Company, { foreignKey: 'companyId', as: 'company' });
    ReportRun.belongsTo(models.NBnextDrive, { foreignKey: 'driveFileId', as: 'payloadFile' });
  };

  return ReportRun;
};
