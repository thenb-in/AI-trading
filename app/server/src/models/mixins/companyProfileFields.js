const {
  DEFAULT_REVIEW_FREQUENCY,
  DEFAULT_APPRAISAL_FREQUENCY
} = require('../../constants/hr/performance');
const {
  DEFAULT_MIN_EMPLOYMENT_AGE,
  DEFAULT_ADOLESCENT_AGE_LIMIT
} = require('../../constants/hr/employment_age');

const companyProfileFields = (DataTypes) => ({
  service_offering_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'App-owned ServiceOffering id for the service this company provides'
  },
  service_charge: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true,
    comment: 'Service charge percentage this company applies'
  },

  job_offer_header_image: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Base64 encoded header image for job offer letter PDF'
  },
  job_offer_footer_image: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Base64 encoded footer image for job offer letter PDF'
  },
  job_offer_header_height_cm: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true,
    defaultValue: 3.0,
    comment: 'Height of header image in centimeters for PDF generation'
  },
  job_offer_footer_height_cm: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true,
    defaultValue: 3.0,
    comment: 'Height of footer image in centimeters for PDF generation'
  },
  username: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'External system (EasyWDMS) username for company credentials'
  },
  password: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'External system (EasyWDMS) password for company credentials'
  },
  manualAttendanceCommentCompulsory: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  },
  enable_cof: {
    type: DataTypes.BOOLEAN,
    allowNull: true,
    defaultValue: null
  },
  holiday_mode: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
    comment: '1=Fixed, 2=Adjacent day basis, 3=% present round to 0.5, 4=% present round to 1, 5=Continuous working fixed (deny if entire preceding week absent)'
  },
  attendance_aliases: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: {},
    comment: 'Company-specific display aliases for attendance status abbreviations'
  },
  // --- Statutory compliance defaults ---
  // Default state used for state-specific statutory compliance (Professional Tax,
  // Labour Welfare Fund) when an employee has no `state` of their own.
  default_state: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: 'Default state for statutory compliance when employee.state is null (PT, LWF)'
  },
  // Establishment headcount, used to determine PF/ESIC applicability
  // (PF: mandatory at 20+, ESIC: mandatory at 10+). Null = treat as applicable.
  establishment_employee_count: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Total employees in the establishment; drives PF/ESIC applicability thresholds'
  },
  // Income-tax regime used for the TDS estimate. 'new' (115BAC) is the default regime.
  tds_regime: {
    type: DataTypes.STRING(10),
    allowNull: false,
    defaultValue: 'new',
    comment: 'Income-tax regime for TDS estimation: \'new\' (115BAC default) or \'old\''
  },
  // Auto-deactivation rule for employees who have stopped punching (nightly scheduler).
  // Counts from the last punch, or from the joining date for someone who never punched.
  // Leave days carry no punch, so a long leave trips this rule the way it used to trip the
  // leave-streak rule this replaced — and an employee who simply stopped showing up without
  // ever filing leave is now caught too.
  no_punch_deactivation_days: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Auto-deactivate active employees after more than this many days without a punch; null disables the scheduler rule'
  },
  // Drives how the ADMS deactivate flow disposes of an employee on devices:
  //   'identity_card'  → emp_code = personal identifier (e.g. national ID),
  //                      not reused after the person leaves → send
  //                      DATA DEL_USER and free the slot.
  //   'serial_number'  → emp_code = sequential slot number, may be reused
  //                      OR conflicts must be avoided → keep the user
  //                      record on device but strip card/password and
  //                      delete all bio templates so authentication fails.
  emp_code_basis: {
    type: DataTypes.ENUM('identity_card', 'serial_number'),
    allowNull: false,
    defaultValue: 'identity_card'
  },
  // Whether a master is identified by its code or by its name. Companies that run on codes
  // (DEPT01, LOC02) want the code shown and matched wherever a master is picked, listed or
  // imported; companies that never assign codes want the name to carry that job instead.
  masters_code_based: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    comment: 'Masters are identified by code (true, the default) or by name (false)'
  },
  // A joining date after today is refused unless a company turns this on, which catches a
  // mistyped year on import. Companies that record a rejoining before the day it happens —
  // Monday's start entered on Friday — switch it on. Applies to a first joining and a
  // rejoining alike.
  allow_future_joining_date: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: 'Accept joining dates after today. Off by default, so a future date is refused'
  },
  // --- Employee defaults ---
  // A company that only ever onboards through one channel says so once here instead of
  // picking the same source on every new employee. Null leaves the per-employee choice open.
  default_employee_src: {
    type: DataTypes.STRING(20),
    allowNull: true,
    comment: 'Employee source (EMPLOYEE_SRC) pre-filled on a new employee; null means no default'
  },
  // Last stop in the salary-structure chain: employee salary row → department → company.
  // Plain integer (no FK) for the same reason as service_offering_id — the app owns the
  // referenced table while this column lives on a framework table.
  default_salary_structure_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'App-owned SalaryStructure id used when neither the employee nor their department has one'
  },
  // --- Performance management ---
  // Which shape this company grades in. Presentation only: the band values below are free
  // text either way, so nothing branches on this when a score is turned into a band.
  // Statutory employment-age lines. Defaults are the Indian statutory floor;
  // sectors with a higher one (Mines Act: 18 flat) raise the minimum here rather
  // than in code. See constants/hr/employment_age.js for what each line means.
  min_employment_age: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: DEFAULT_MIN_EMPLOYMENT_AGE,
    comment: 'Below this age employment is prohibited and the employee cannot be saved'
  },
  adolescent_age_limit: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: DEFAULT_ADOLESCENT_AGE_LIMIT,
    comment: 'Below this age an employee is an adolescent: no hazardous work, fitness certificate required'
  },
  performance_rating_style: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'alphabetic',
    comment: 'How an appraisal result reads: \'alphabetic\' (A, B, C) or \'numeric\' (5, 4, 3)'
  },
  // Default cadences. A department may override either; most never do.
  review_frequency: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: DEFAULT_REVIEW_FREQUENCY,
    comment: 'Default performance review cadence for departments that do not set their own'
  },
  appraisal_frequency: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: DEFAULT_APPRAISAL_FREQUENCY,
    comment: 'Default appraisal cadence for departments that do not set their own'
  },
  // The only thing scoring reads. Empty means the built-in default applies, so a company
  // that never opens the setting keeps grading exactly as it did.
  performance_rating_bands: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: [],
    comment: 'Score-to-band map: [{band, label, min_percent}], highest min_percent first. Empty means the built-in default'
  }
});

module.exports = { companyProfileFields };
