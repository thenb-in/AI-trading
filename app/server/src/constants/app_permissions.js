// HR/payroll-specific permissions for the etime app.
//
// Product-specific permissions (employee, salary, attendance, gatepass,
// canteen, terminals, WageMaster, call buddy, ...) live here in the app layer.
// Generic, framework-level permissions shared by every product built on
// startup (user, company, role, permission, role_permission, notifications)
// live in `@startup/src/constants/base_permissions`.
//
// These sets are composed with the framework sets in `./permissions`, which is
// the surface every app consumer imports. Nothing should import this file
// directly except that composition point — import `../constants/permissions`
// instead.

const basePermissions = require('@startup/src/constants/base_permissions');
const { CUSTOM_REPORT_PERMISSION_CONSTANTS } = require('@custom/server/constants/permissions');

const {
  create_master_permission,
  create_module_permission,
  create_report_permission
} = basePermissions;

const APP_MASTER_PERMISSION_CONSTANTS = {
  EMPLOYEE: create_master_permission('employee_master'),
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
  PERSONNEL_AREA: create_master_permission('personnel_area'),
  EMPLOYEE_AREA_ASSIGNMENT: create_master_permission('employee_area_assignment'),
  LEAVES_TAKEN: create_master_permission('leaves_taken'),
  REIMBURSEMENT: create_master_permission('reimbursement'),
  ADVANCE: create_master_permission('advance', true), // approval_required = true
  REPAYMENT: create_master_permission('repayment'),
  FORMULA_MASTER: create_master_permission('formula_master'),
  RAW_PUNCH: create_master_permission('raw_punch'),
  HOLIDAYS: create_master_permission('holiday'),
  GATEPASS: create_master_permission('gatepass', true),
  DEPARTMENT: create_master_permission('department'),
  POSITION: create_master_permission('position'),
  OPERATION_CYCLE: create_master_permission('operation_cycle'),
  ROLE_RESPONSIBILITY: create_master_permission('role_responsibility'),
  LEAVE_TYPE: create_master_permission('leave_type'),
  ALLOWANCE_TYPE: create_master_permission('allowance_type'),
  JOB_OFFER_SALARY_STRUCTURE: create_master_permission('job_offer_salary_structure'),
  SALARY_STRUCTURE: create_master_permission('salary_structure'),
  PURPOSE_TYPE: create_master_permission('purpose_type'),
  CONTACT_STATUS: create_master_permission('contact_status'),
  SERVICE_OFFERING: create_master_permission('service_offering'),
  CUSTOMER: create_master_permission('customer'),
  LEAVE_LIST: create_master_permission('leave_list'),
  EMPLOYEE_MERGE: create_master_permission('employee_merge'),
  TIMETABLE: create_master_permission('timetable'),
  MANUAL_ATTENDANCE: create_master_permission('manual_attendance', true),
  ATTENDANCE_UNLOCK: {
    unlock: {
      name: 'unlock_attendance',
      display_name: 'Unlock Attendance',
      description: 'Permission to unlock a locked attendance day so it can be edited again'
    }
  },
  MANUAL_PUNCHES: create_master_permission('manual_punches', true),
  MANUAL_SALARIES: create_master_permission('manual_salaries'),
  VASTRAM_DAILY_COUNTER: create_master_permission('vastram_daily_counter'),
  EMPLOYEE_SCHEDULE: create_master_permission('employee_schedule'),
  COMPOUND_SHIFT: create_master_permission('compound_shift'),
  HOLIDAY_TYPE: create_master_permission('holiday_type'),
  WEEKLY_OFF: create_master_permission('weekly_off'),
  COST_CENTER: create_master_permission('cost_center'),
  ASSET: create_master_permission('asset'),
  ASSET_ALLOCATION: create_master_permission('asset_allocation'),
  PERFORMANCE_CYCLE: create_master_permission('performance_cycle'),
  PERFORMANCE_PARAMETER: create_master_permission('performance_parameter'),
  // approval_required = true: Finalise is the approve, Send Back is the reject. Signing off
  // an appraisal is a different authority from filling one in.
  PERFORMANCE_REVIEW: create_master_permission('performance_review', true),
  COST_CENTER_DETAILS: {
    manage: {
      name: 'manage_cost_center_details',
      display_name: 'Manage Cost Center Details',
      description: 'Permission to view and manage the customer linked to a cost center'
    }
  },
  CONTACT: create_master_permission('contact_master'),
  WHATSAPP_TEMPLATE: create_master_permission('whatsapp_template'),
  TERMINAL: create_master_permission('terminal_master'),
  TERMINAL_COMMANDS: create_master_permission('terminal_commands_master'),
  CANTEEN_TOKEN_PRINT: create_master_permission('canteen_token_print'),
  CANTEEN_MEAL_TYPE: create_master_permission('canteen_meal_type'),
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
  // Pulling an employee's Aadhaar demographics out of DigiLocker is a separate
  // authority from editing the employee master: it spends money per call and it
  // reads government identity data. A single `manage` entry, like the terminal
  // feature flags above, because there is no CRUD shape to grant here.
  EMPLOYEE_KYC_LOOKUP: {
    manage: {
      name: 'manage_employee_kyc_lookup',
      display_name: 'Fetch Employee Details from DigiLocker',
      description:
        'Permission to fetch an employee Aadhaar details via DigiLocker consent and prefill the employee master'
    }
  },
  ACTIVITY: create_master_permission('activity'),
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

const APP_MODULE_PERMISSION_CONSTANTS = {
  VIEW_ORGANIZATION_STRUCTURE_MODULE: create_module_permission('organization_structure', 'Organization Structure'),
  MANAGE_ORGANIZATION_STRUCTURE: {
    name: 'manage_organization_structure',
    display_name: 'Manage Organization Structure',
    description: 'Permission to change the organization structure'
  },
  VIEW_DASHBOARD_MODULE: create_module_permission('dashboard', 'Dashboards'),
  VIEW_HR_DASHBOARD_MODULE: create_module_permission('hr_dashboard', 'HR Dashboard'),
  // The worklist is its own page and its own permission: the people who clear
  // it are not always the people who read the dashboard's analytics, and vice
  // versa. Granting one should not force the other.
  VIEW_CHECKLIST_MODULE: create_module_permission('checklist', 'Checklist'),
  // Employee self-service. Meant to be granted to everybody, which is safe because the
  // endpoints behind it scope to the caller's own employee record — the permission opens the
  // page, it does not decide whose appraisal is on it.
  VIEW_MY_APPRAISAL_MODULE: create_module_permission('my-appraisal', 'My Appraisal'),
  VIEW_WAGEMASTER_MODULE: create_module_permission('wagemaster', 'WageMaster'),
  VIEW_BIOMETRIC_PUNCH_MODULE: create_module_permission('biometric-punch', 'Biometric Punch'),
  VIEW_ALL_CONTACTS: {
    name: 'view_all_contacts',
    display_name: 'View All Contacts',
    description: 'Permission to view all contacts'
  },
  ASSIGN_CONTACT_PERMISSION: {
    name: 'assign_permission',
    display_name: 'Assign Contact Permission',
    description: 'Permission to assign contacts to users'
  },
  MULTI_ASSIGN_CONTACTS: {
    name: 'multi_assign_contacts',
    display_name: 'Allow Multiple Call Executives Per Contact',
    description: 'If granted, a single contact can be assigned to multiple call executives at the same time'
  },
  ADD_CALL_LOG_MANUAL: {
    name: 'add_call_log_manual',
    display_name: 'Add Manual Call Log',
    description: 'If granted, the user can manually add a call log entry from the mobile app'
  },
  AUTO_CONTACT_ALLOCATION: {
    name: 'auto_contact_allocation',
    display_name: 'Auto Contact Allocation',
    description:
      'If granted, after call-log sync the system tops up this user\'s unspoken contact pool when it runs low'
  },
  MULTIPLE_NOT_INTERESTED: {
    name: 'multiple_not_interested',
    display_name: 'Multiple Not Interested Tracking',
    description:
      'If granted, marking a contact Not Interested soft-flags the assignment and records not_interested slots so the contact can be reassigned to others'
  },
  USE_DIALER: {
    name: 'use_dialer',
    display_name: 'Use Dialer',
    description: 'If granted, the in-app Dialer tab is shown to the user in the mobile app'
  },
  SWITCH_USER: {
    name: 'switch_user',
    display_name: 'Switch User',
    description: 'If granted, the user can switch to / act as another user'
  },
  SEND_WHATSAPP_NOTIFICATION: {
    name: 'send_whatsapp_notification',
    display_name: 'Send WhatsApp Notification',
    description: 'If granted, the user receives notifications over WhatsApp in addition to in-app'
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

const APP_REPORT_PERMISSION_CONSTANTS = {
  DETAILED_ATTENDANCE_REPORT: create_report_permission('detailed-attendance-report'),
  CHECKIN_CHECKOUT_REPORT: create_report_permission('checkin-checkout-report'),
  MISSING_CHECKINS_REPORT: create_report_permission('missing-checkins-report'),
  TRANSACTION_REPORT: create_report_permission('transaction-report'),
  DIRECTION_CONFLICTS_REPORT: create_report_permission('direction-conflicts-report'),
  SALARY_REGISTER_REPORT: create_report_permission('salary-register-report'),
  SALARY_CHANGE_REPORT: create_report_permission('salary-change-report'),
  SALARY_WITH_ATTENDANCE_REPORT: create_report_permission('salary-with-attendance-report'),
  DEACTIVATION_USER_REPORT: create_report_permission('deactivation-user-report'),
  EMPLOYEE_LIFECYCLE_REPORT: create_report_permission('employee-lifecycle-report'),
  SHIFT_SUMMARY_REPORT: create_report_permission('shift-summary-report'),
  MONTHLY_ATTENDANCE_REPORT: create_report_permission('monthly-attendance-report'),
  MONTHLY_WORK_HOURS_REPORT: create_report_permission('monthly-work-hours-report'),
  DETAILED_HORIZONTAL_REPORT: create_report_permission('detailed-horizontal-report'),
  PRINTABLE_ATTENDANCE_REPORT: create_report_permission('printable-attendance-report'),
  PF_REPORT: create_report_permission('pf-report'),
  ESIC_REPORT: create_report_permission('esic-report'),
  ALL_LEAVES_REPORT: create_report_permission('all-leaves-report'),
  LEAVE_BANK_REPORT: create_report_permission('leave-bank-report'),
  LEAVE_TRANSACTION_REPORT: create_report_permission('leave-transaction-report'),
  UNREGISTERED_FACES_REPORT: create_report_permission('unregistered-faces-report'),
  CALL_BUDDY_REPORT: create_report_permission('call-buddy-report'),
  CONTACT_FOLLOWUP_REPORT: create_report_permission('contact-followup-report'),
  LEAD_CONVERSION_REPORT: create_report_permission('lead-conversion-report'),
  BIOTEMPLATE_REPORT: create_report_permission('biotemplate-report'),
  FINAL_WAGE_REPORT_FOR_CONTRACTOR: create_report_permission('final-wage-report-for-contractor'),
  DAILY_SALES_PERSON_REPORT: create_report_permission('daily-sales-person-report'),
  SALES_ACTIVITY_REPORT: create_report_permission('sales-activity-report'),
  // The movement trail at event grain. Its own permission because it names where
  // an individual physically was, minute by minute — a narrower audience than the
  // distance and visit roll-ups built on the same rows.
  LOCATION_LOG_REPORT: create_report_permission('location-log-report'),
  HALT_POINTS_REPORT: create_report_permission('halt-points-report'),
  IDENTIFY_OFFICER_REPORT: create_report_permission('identify-officer-report'),
  VASTRAM_DAILY_PERFORMANCE_REPORT: create_report_permission('vastram-daily-performance-report'),
  CANTEEN_REPORT: create_report_permission('canteen-report'),
  // Performance management. Separate permissions because the appraisal summary carries
  // individual scores, while band distribution and KRA analysis are aggregate — a line
  // manager can be shown the shape of a round without being shown everybody's grade.
  APPRAISAL_SUMMARY_REPORT: create_report_permission('appraisal-summary-report'),
  BAND_DISTRIBUTION_REPORT: create_report_permission('band-distribution-report'),
  KRA_ANALYSIS_REPORT: create_report_permission('kra-analysis-report'),
  CYCLE_PROGRESS_REPORT: create_report_permission('cycle-progress-report'),
  // Readiness reports — the data-quality gates behind the checklist. Separate
  // permissions because payroll readiness exposes bank and statutory numbers
  // that roster coverage does not.
  PAYROLL_READINESS_REPORT: create_report_permission('payroll-readiness-report'),
  // Statutory age compliance. Separate permission because the grid carries dates
  // of birth for minors — a narrower audience than general readiness data.
  EMPLOYMENT_AGE_COMPLIANCE_REPORT: create_report_permission('employment-age-compliance-report'),
  ROSTER_COVERAGE_REPORT: create_report_permission('roster-coverage-report'),
  PENDING_APPROVALS_REPORT: create_report_permission('pending-approvals-report'),
  TERMINAL_HEALTH_REPORT: create_report_permission('terminal-health-report'),
  ADVANCE_RECOVERY_REPORT: create_report_permission('advance-recovery-report'),
  // Headcount per site. Its own permission because an area's staffing is an
  // operational fact a site manager needs and a payroll clerk does not, and the
  // HR dashboard's headcount section is gated on this same grant.
  AREA_HEADCOUNT_REPORT: create_report_permission('area-headcount-report'),
  // Multi-location HR. Granted separately from each other on purpose: campus presence names
  // who is on site right this minute, which is a security-desk fact rather than an HR one,
  // while the site comparison and coverage views are aggregate and the movement report names
  // individuals against the places they were not meant to be.
  CAMPUS_PRESENCE_REPORT: create_report_permission('campus-presence-report'),
  SITE_ATTENDANCE_REPORT: create_report_permission('site-attendance-report'),
  CROSS_SITE_MOVEMENT_REPORT: create_report_permission('cross-site-movement-report'),
  SITE_COVERAGE_REPORT: create_report_permission('site-coverage-report'),
  CANTEEN_BY_SITE_REPORT: create_report_permission('canteen-by-site-report'),
  // Filter presets over existing reports. No server route of their own — the
  // client points them at the base report's slug — but each needs a permission
  // so it can be granted or withheld like any other report.
  UNLOCKED_ATTENDANCE_REPORT: create_report_permission('unlocked-attendance-report'),
  NEGATIVE_LEAVE_BALANCE_REPORT: create_report_permission('negative-leave-balance-report'),
  ...CUSTOM_REPORT_PERMISSION_CONSTANTS
};

module.exports = {
  APP_MASTER_PERMISSION_CONSTANTS,
  APP_MODULE_PERMISSION_CONSTANTS,
  APP_REPORT_PERMISSION_CONSTANTS
};
