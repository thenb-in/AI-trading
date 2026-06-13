const basePermissions = require('./base_permissions');
const baseRoles = require('./base_roles');



const SYSTEM_ROLE_CONSTANTS = baseRoles.SYSTEM_ROLE_CONSTANTS;

const MASTER_PERMISSION_CONSTANTS = {
  ...basePermissions.MASTER_PERMISSION_CONSTANTS,
  EMPLOYEE: basePermissions.create_master_permission('employee_master'),
  EMPLOYEE_SALARY: {
    create: {
      name: 'create_employee_salary',
      display_name: 'Create Employee Salary',
      description: 'Permission to create employee salary information'
    },
    read: {
      name: 'read_employee_salary',
      display_name: 'Read Employee Salary',
      description: 'Permission to read employee salary information'
    },
    update: {
      name: 'update_employee_salary',
      display_name: 'Update Employee Salary',
      description: 'Permission to update employee salary information'
    }
  },
  PERSONNEL_AREA: basePermissions.create_master_permission('personnel_area'),
  LEAVES_TAKEN: basePermissions.create_master_permission('leaves_taken'),
  REIMBURSEMENT: basePermissions.create_master_permission('reimbursement'),
  ADVANCE: basePermissions.create_master_permission('advance', true), // approval_required = true
  REPAYMENT: basePermissions.create_master_permission('repayment'),
  FORMULA_MASTER: basePermissions.create_master_permission('formula_master'),
  RAW_PUNCH: basePermissions.create_master_permission('raw_punch'),
  HOLIDAYS: basePermissions.create_master_permission('holiday'),
  GATEPASS: basePermissions.create_master_permission('gatepass', true),
  DEPARTMENT: basePermissions.create_master_permission('department'),
  POSITION: basePermissions.create_master_permission('position'),
  LEAVE_TYPE: basePermissions.create_master_permission('leave_type'),
  ALLOWANCE_TYPE: basePermissions.create_master_permission('allowance_type'),
  JOB_OFFER_SALARY_STRUCTURE: basePermissions.create_master_permission('job_offer_salary_structure'),
  SALARY_STRUCTURE: basePermissions.create_master_permission('salary_structure'),
  PURPOSE_TYPE: basePermissions.create_master_permission('purpose_type'),
  SERVICE_OFFERING: basePermissions.create_master_permission('service_offering'),
  CUSTOMER: basePermissions.create_master_permission('customer'),
  LEAVE_LIST: basePermissions.create_master_permission('leave_list'),
  EMPLOYEE_MERGE: basePermissions.create_master_permission('employee_merge'),
  TIMETABLE: basePermissions.create_master_permission('timetable'),
  MANUAL_ATTENDANCE: basePermissions.create_master_permission('manual_attendance', true),
  MANUAL_PUNCHES: basePermissions.create_master_permission('manual_punches', true),
  MANUAL_SALARIES: basePermissions.create_master_permission('manual_salaries'),
  EMPLOYEE_SCHEDULE: basePermissions.create_master_permission('employee_schedule'),
  COMPOUND_SHIFT: basePermissions.create_master_permission('compound_shift'),
  HOLIDAY_TYPE: basePermissions.create_master_permission('holiday_type'),
  WEEKLY_OFF: basePermissions.create_master_permission('weekly_off'),
  HOLIDAY_DAYS: basePermissions.create_master_permission('holiday_days'),
  COST_CENTER: basePermissions.create_master_permission('cost_center'),
  COST_CENTER_DETAILS: {
    manage: {
      name: 'manage_cost_center_details',
      display_name: 'Manage Cost Center Details',
      description: 'Permission to view and manage the customer linked to a cost center'
    }
  },
  CONTACT: basePermissions.create_master_permission('contact_master'),
  WHATSAPP_TEMPLATE: basePermissions.create_master_permission('whatsapp_template'),
  TERMINAL: basePermissions.create_master_permission('terminal_master'),
  TERMINAL_COMMANDS: basePermissions.create_master_permission('terminal_commands_master'),
  CANTEEN_TOKEN_PRINT: basePermissions.create_master_permission('canteen_token_print'),
  // Feature-flag permissions for terminal command generation. Each is a
  // single `manage` entry so the subscription module can toggle them
  // per-company without exposing CRUD shape. requirePermission on the
  // routes + assertCompanyPermission inside the biometric interface read
  // these names; see biometric_gateway/adms_server/interfaces/adms/index.js.
  TERMINAL_EMPLOYEE_SYNC: {
    manage: {
      name: 'manage_terminal_employee_sync',
      display_name: 'Manage Terminal Employee Sync',
      description: 'Permission to push/pull employee data to/from terminals'
    }
  },
  TERMINAL_ATTENDANCE_SYNC: {
    manage: {
      name: 'manage_terminal_attendance_sync',
      display_name: 'Manage Terminal Attendance Sync',
      description: 'Permission to sync attendance/transactions and clear attendance data from terminals'
    }
  },
  TERMINAL_DEVICE_MANAGEMENT: {
    manage: {
      name: 'manage_terminal_device_management',
      display_name: 'Manage Terminal Device Management',
      description: 'Permission to perform device management actions on terminals (reboot, initial sync, timezone, custom commands, TCP test, enable/disable)'
    }
  },
  ACTIVITY: basePermissions.create_master_permission('activity'),
  NBNEXT_DRIVE: {
    create: {
      name: 'create_nbnext_drive',
      display_name: 'Create NBnext Drive',
      description: 'Permission to create files in NBnext Drive'
    },
    read: {
      name: 'read_nbnext_drive',
      display_name: 'Read All NBnext Drive',
      description: 'Permission to read all files in NBnext Drive'
    },
    readPersonal: {
      name: 'read_personal_nbnext_drive',
      display_name: 'Read Personal NBnext Drive',
      description: 'Permission to read personal files in NBnext Drive'
    },
    delete: {
      name: 'delete_nbnext_drive',
      display_name: 'Delete NBnext Drive',
      description: 'Permission to delete files from NBnext Drive'
    },
    download: {
      name: 'download_nbnext_drive',
      display_name: 'Download NBnext Drive',
      description: 'Permission to download files from NBnext Drive'
    }
  }
};

const create_module_permission = (module, displayName) => {
  const moduleKey = module.toLowerCase().replace(/-/g, '_');
  const formattedDisplayName = displayName || module.split('-').map(word =>
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ');
  return {
    name: `view_${moduleKey}_module`,
    display_name: `View ${formattedDisplayName} Module`,
    description: `Permission to view ${formattedDisplayName.toLowerCase()} module`
  };
};

const MODULE_PERMISSION_CONSTANTS = {
  ...basePermissions.MODULE_PERMISSION_CONSTANTS,
  ...MASTER_PERMISSION_CONSTANTS,
  VIEW_WAGEMASTER_MODULE: create_module_permission('wagemaster', 'WageMaster'),
  VIEW_ACTIVITIES_MODULE: create_module_permission('activities', 'Activities'),
  VIEW_IDENTIFY_OFFICER_MODULE: create_module_permission('identify-officer', 'Identify Officer'),
  VIEW_BIOMETRIC_PUNCH_MODULE: create_module_permission('biometric-punch', 'Biometric Punch'),
  VIEW_ALL_CONTACTS:{
    name: 'view_all_contacts',
    display_name: 'View All Contacts',
    description: 'Permission to view all contacts'
  },
  ASSIGN_CONTACT_PERMISSION:{
    name: 'assign_permission',
    display_name: 'Assign Contact Permission',
    description: 'Permission to assign contacts to users'
  },
  MULTI_ASSIGN_CONTACTS: {
    name: 'multi_assign_contacts',
    display_name: 'Allow Multiple Call Executives Per Contact',
    description: 'If granted, a single contact can be assigned to multiple call executives at the same time'
  },
  LOCATION_ACCESS: {
    name: 'app_location_access',
    display_name: 'App Location Access',
    description: 'Permission to access device location in mobile app',
    type: 'app'
  },
  CALL_ACCESS: {
    name: 'app_call_access',
    display_name: 'App Call Access',
    description: 'Permission to access phone call functionality in mobile app',
    type: 'app'
  },
  SALARYMITRA_ACCESS: {
    name: 'app_salarymitra_access',
    display_name: 'App SalaryMitra Access',
    description: 'Permission to access SalaryMitra features in mobile app',
    type: 'app'
  }
};

const REPORT_PERMISSION_CONSTANTS = {
  ...basePermissions.REPORT_PERMISSION_CONSTANTS,
  DETAILED_ATTENDANCE_REPORT: basePermissions.create_report_permission('detailed-attendance-report'),
  CHECKIN_CHECKOUT_REPORT: basePermissions.create_report_permission('checkin-checkout-report'),
  MISSING_CHECKINS_REPORT: basePermissions.create_report_permission('missing-checkins-report'),
  TRANSACTION_REPORT: basePermissions.create_report_permission('transaction-report'),
  DIRECTION_CONFLICTS_REPORT: basePermissions.create_report_permission('direction-conflicts-report'),
  SALARY_REGISTER_REPORT: basePermissions.create_report_permission('salary-register-report'),
  SALARY_CHANGE_REPORT: basePermissions.create_report_permission('salary-change-report'),
  SALARY_WITH_ATTENDANCE_REPORT: basePermissions.create_report_permission('salary-with-attendance-report'),
  DEACTIVATION_USER_REPORT: basePermissions.create_report_permission('deactivation-user-report'),
  DEACTIVATED_EMPLOYEES_REPORT: basePermissions.create_report_permission('deactivated-employees-report'),
  NEW_EMPLOYEES_REPORT: basePermissions.create_report_permission('new-employees-report'),
  SHIFT_SUMMARY_REPORT: basePermissions.create_report_permission('shift-summary-report'),
  MONTHLY_ATTENDANCE_REPORT: basePermissions.create_report_permission('monthly-attendance-report'),
  MONTHLY_WORK_HOURS_REPORT: basePermissions.create_report_permission('monthly-work-hours-report'),
  DETAILED_HORIZONTAL_REPORT: basePermissions.create_report_permission('detailed-horizontal-report'),
  PF_REPORT: basePermissions.create_report_permission('pf-report'),
  ESIC_REPORT: basePermissions.create_report_permission('esic-report'),
  PROFESSIONAL_TAX_REPORT: basePermissions.create_report_permission('professional-tax-report'),
  LWF_REPORT: basePermissions.create_report_permission('lwf-report'),
  TDS_REPORT: basePermissions.create_report_permission('tds-report'),
  PF_FORM5_REPORT: basePermissions.create_report_permission('pf-form5-report'),
  PF_FORM10_REPORT: basePermissions.create_report_permission('pf-form10-report'),
  ALL_LEAVES_REPORT: basePermissions.create_report_permission('all-leaves-report'),
  LEAVE_BANK_REPORT: basePermissions.create_report_permission('leave-bank-report'),
  UNREGISTERED_FACES_REPORT: basePermissions.create_report_permission('unregistered-faces-report'),
  CALL_BUDDY_REPORT: basePermissions.create_report_permission('call-buddy-report'),
  BIOTEMPLATE_REPORT: basePermissions.create_report_permission('biotemplate-report'),
  FINAL_WAGE_REPORT_FOR_CONTRACTOR: basePermissions.create_report_permission('final-wage-report-for-contractor'),
  DAILY_SALES_PERSON_REPORT: basePermissions.create_report_permission('daily-sales-person-report'),
  SALES_ACTIVITY_REPORT: basePermissions.create_report_permission('sales-activity-report')
};


module.exports = {
  MODULE_PERMISSION_CONSTANTS,
  SYSTEM_ROLE_CONSTANTS,
  MASTER_PERMISSION_CONSTANTS,
  REPORT_PERMISSION_CONSTANTS
};
