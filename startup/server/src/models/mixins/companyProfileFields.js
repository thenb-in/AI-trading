/**
 * Sequelize attribute schema for CompanyProfile's non-key columns. Kept as a
 * framework-local mixin (not app-side) so `startup` never has to reach into
 * `app` — the dependency arrow always points app -> startup, never back.
 *
 * Spread the result into `sequelize.define`'s attributes argument alongside the
 * id/companyId keys the model owns directly.
 *
 * Columns:
 *   - username/password: credentials for the company's external (Django) auth,
 *     mirrored from the live `company_profiles` table.
 *   - default_state / establishment_employee_count: captured at self-serve
 *     onboarding (see src/onboarding/onboarding.workspace.service.js).
 */
function companyProfileFields(DataTypes) {
  return {
    username: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Django/external system username for company credentials'
    },
    password: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Django/external system password for company credentials'
    },
    default_state: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'State captured at onboarding; default for statutory calculations'
    },
    establishment_employee_count: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Establishment headcount captured at onboarding'
    }
  };
}

module.exports = { companyProfileFields };
