const express = require('express');
const router = express.Router();
const authMiddleware = require('@startup/src/middleware/authMiddleware');
const requirePermission = require('@startup/src/middleware/requirePermission');
const { REPORT_PERMISSION_CONSTANTS } = require('../constants/permissions');
router.use(authMiddleware.protect); // Protect all routes

// Import individual report handlers
const { getTransactionReport } = require('../views/reports/transactionReport');
const { getCheckinCheckoutReport } = require('../views/reports/checkinCheckoutReport');
const { getDetailedAttendanceReport } = require('../views/reports/detailedAttendanceReport');
const { getDeactivationUserReport } = require('../views/reports/deactivationUserReport');
const { getEmployeeLifecycleReport } = require('../views/reports/employeeLifecycleReport');
const { getShiftSummaryReport } = require('../views/reports/shiftSummaryReport');
const { getSalaryRegisterReport } = require('../views/reports/salaryRegisterReport');
const { getSalaryChangeReport } = require('../views/reports/salaryChangeReport');
const { getPFReport } = require('../views/reports/pfReport');
const { getESICReport } = require('../views/reports/esicReport');
const { getLeaveBankReport } = require('../views/reports/leaveBankReport');
const { getLeaveTransactionReport } = require('../views/reports/leaveTransactionReport');
const { getAllLeavesReport } = require('../views/reports/allLeavesReport');
const performanceReports = require('../views/reports/performanceReports');
const { getUnregisteredFacesReport, deleteUnregisteredFace, assignUnregisteredFace } = require('../views/reports/unregisteredFacesReport');
const { getBiotemplateReport, registerBiotemplate, pushBiotemplate, deleteBiotemplate } = require('../views/reports/biotemplateReport');

// Field-sales report handlers (daily/monthly/dealer + analytics + halt points)
const fieldSalesReports = require('../views/reports/field_sales');
const { getCallBuddyReport } = require('../views/reports/callBuddyReport');
const { getLeadConversionReport } = require('../views/reports/leadConversionReport');
const { getRepeatedCallsReport } = require('../views/reports/repeatedCallsReport');
const { getCommonContactsReport } = require('../views/reports/commonContactsReport');
const { getContactFollowupReport } = require('../views/reports/contactFollowupReport');
const { getFinalWageReportForContractor } = require('../views/reports/finalWageReportForContractor');
const { getDailySalesPersonReport } = require('../views/reports/dailySalesPersonReport');
const { getSalesActivityReport } = require('../views/reports/salesActivityReport');
const { getLocationLogReport } = require('../views/reports/locationLogReport');
const { getHaltPointsReport } = require('../views/reports/haltPointsReport');
const { getIdentifyOfficerReport } = require('../views/reports/identifyOfficerReport');
const { getVastramDailyPerformanceReport } = require('../views/reports/vastramDailyPerformanceReport');
const { getCanteenReport } = require('../views/reports/canteenReport');
// Readiness reports — the data-quality gates the checklist reads from.
const readinessReports = require('../views/reports/readiness');
const { getAreaHeadcountReport } = require('../views/reports/areaHeadcountReport');
const siteReports = require('../views/reports/site');
// Customer-specific reports. They live outside the product's report set but
// register onto this router, so they are reached at /reports/<slug> like any
// other report and the socket runner picks them up the same way.
const { registerCustomReportRoutes } = require('@custom/server');

// Report routes
router.get('/deactivation-user-report', getDeactivationUserReport);
router.get('/employee-lifecycle-report', getEmployeeLifecycleReport);
router.get('/transaction-report', getTransactionReport);
router.get('/direction-conflicts-report', getTransactionReport);
router.get('/checkin-checkout-report', getCheckinCheckoutReport);
router.get('/vastram-daily-performance-report', getVastramDailyPerformanceReport);
// Monthly attendance, monthly work hours, detailed horizontal, and printable
// attendance reports all use the same API as detailed-attendance-report
router.get('/detailed-attendance-report', getDetailedAttendanceReport);
router.get('/monthly-attendance-report', getDetailedAttendanceReport);
router.get('/monthly-work-hours-report', getDetailedAttendanceReport);
router.get('/detailed-horizontal-report', getDetailedAttendanceReport);
router.get('/printable-attendance-report', getDetailedAttendanceReport);

router.get('/salary-register-report', getSalaryRegisterReport);
router.get('/salary-with-attendance-report', getSalaryRegisterReport);
router.get('/salary-change-report', getSalaryChangeReport);
router.get('/shift-summary-report', getShiftSummaryReport);
router.get('/pf-report', getPFReport);
router.get('/esic-report', getESICReport);
router.get('/leave-bank-report', getLeaveBankReport);
router.get('/leave-transaction-report', getLeaveTransactionReport);
router.get('/all-leaves-report', getAllLeavesReport);

// Performance management. Each carries its own permission: the appraisal summary lists
// individual grades, while the distribution, KRA and progress views are aggregate, so a
// line manager can be shown the shape of a round without being shown everybody's score.
router.get('/appraisal-summary-report',  requirePermission(REPORT_PERMISSION_CONSTANTS.APPRAISAL_SUMMARY_REPORT.name),  performanceReports.getAppraisalSummaryReport);
router.get('/band-distribution-report',  requirePermission(REPORT_PERMISSION_CONSTANTS.BAND_DISTRIBUTION_REPORT.name),  performanceReports.getBandDistributionReport);
router.get('/kra-analysis-report',       requirePermission(REPORT_PERMISSION_CONSTANTS.KRA_ANALYSIS_REPORT.name),       performanceReports.getKraAnalysisReport);
router.get('/cycle-progress-report',     requirePermission(REPORT_PERMISSION_CONSTANTS.CYCLE_PROGRESS_REPORT.name),     performanceReports.getCycleProgressReport);

// Readiness reports. Each is guarded by its own permission — payroll readiness
// exposes bank and statutory numbers that roster coverage does not, so they
// are not granted together by accident.
router.get('/payroll-readiness-report', requirePermission(REPORT_PERMISSION_CONSTANTS.PAYROLL_READINESS_REPORT.name), readinessReports.getPayrollReadinessReport);
router.get('/roster-coverage-report',   requirePermission(REPORT_PERMISSION_CONSTANTS.ROSTER_COVERAGE_REPORT.name),   readinessReports.getRosterCoverageReport);
router.get('/pending-approvals-report', requirePermission(REPORT_PERMISSION_CONSTANTS.PENDING_APPROVALS_REPORT.name), readinessReports.getPendingApprovalsReport);
router.get('/terminal-health-report',   requirePermission(REPORT_PERMISSION_CONSTANTS.TERMINAL_HEALTH_REPORT.name),   readinessReports.getTerminalHealthReport);
router.get('/advance-recovery-report',  requirePermission(REPORT_PERMISSION_CONSTANTS.ADVANCE_RECOVERY_REPORT.name),  readinessReports.getAdvanceRecoveryReport);
// Where the workforce sits, and whether anything at each site collects its attendance. Its
// own permission: an area's staffing is an operational fact a site manager needs and a
// payroll clerk does not.
router.get('/area-headcount-report',    requirePermission(REPORT_PERMISSION_CONSTANTS.AREA_HEADCOUNT_REPORT.name),    getAreaHeadcountReport);

// Multi-location HR. A permission each, because they are not one audience: campus presence
// names who is on site this minute (a gate desk reads it), the site comparison and coverage
// views are aggregate, and cross-site movement names individuals against places they were
// not assigned to.
router.get('/campus-presence-report',     requirePermission(REPORT_PERMISSION_CONSTANTS.CAMPUS_PRESENCE_REPORT.name),     siteReports.getCampusPresenceReport);
router.get('/site-attendance-report',     requirePermission(REPORT_PERMISSION_CONSTANTS.SITE_ATTENDANCE_REPORT.name),     siteReports.getSiteAttendanceReport);
router.get('/cross-site-movement-report', requirePermission(REPORT_PERMISSION_CONSTANTS.CROSS_SITE_MOVEMENT_REPORT.name), siteReports.getCrossSiteMovementReport);
router.get('/site-coverage-report',       requirePermission(REPORT_PERMISSION_CONSTANTS.SITE_COVERAGE_REPORT.name),       siteReports.getSiteCoverageReport);
router.get('/canteen-by-site-report',     requirePermission(REPORT_PERMISSION_CONSTANTS.CANTEEN_BY_SITE_REPORT.name),     siteReports.getCanteenBySiteReport);
// Carries dates of birth for minors, so it is granted separately from the rest.
router.get('/employment-age-compliance-report', requirePermission(REPORT_PERMISSION_CONSTANTS.EMPLOYMENT_AGE_COMPLIANCE_REPORT.name), readinessReports.getEmploymentAgeComplianceReport);
router.get('/call-buddy-report', getCallBuddyReport);
// Same call-buddy contact data as call-buddy-report, so it shares that report's
// permission for visibility and stays ungated at REST like its sibling.
router.get('/lead-conversion-report', getLeadConversionReport);
router.get('/repeated-calls-report', getRepeatedCallsReport);
router.get('/common-contacts-report', getCommonContactsReport);
router.get('/contact-followup-report', getContactFollowupReport);
router.get(
  '/canteen-report',
  requirePermission(REPORT_PERMISSION_CONSTANTS.CANTEEN_REPORT.name),
  getCanteenReport
);
router.get(
  '/final-wage-report-for-contractor',
  requirePermission(REPORT_PERMISSION_CONSTANTS.FINAL_WAGE_REPORT_FOR_CONTRACTOR.name),
  getFinalWageReportForContractor
);

// Unregistered faces report
router.get('/unregistered-faces-report', getUnregisteredFacesReport);
router.post('/unregistered-faces-report/delete', deleteUnregisteredFace);
router.post('/unregistered-faces-report/assign', assignUnregisteredFace);

// Biotemplate report
router.get(
  '/biotemplate-report',
  requirePermission(REPORT_PERMISSION_CONSTANTS.BIOTEMPLATE_REPORT.name),
  getBiotemplateReport
);
router.post(
  '/biotemplate-report/register',
  requirePermission(REPORT_PERMISSION_CONSTANTS.BIOTEMPLATE_REPORT.name),
  registerBiotemplate
);
router.post(
  '/biotemplate-report/push',
  requirePermission(REPORT_PERMISSION_CONSTANTS.BIOTEMPLATE_REPORT.name),
  pushBiotemplate
);
router.post(
  '/biotemplate-report/delete',
  requirePermission(REPORT_PERMISSION_CONSTANTS.BIOTEMPLATE_REPORT.name),
  deleteBiotemplate
);

// Daily Sales Person Report (registered top-level so report.slug routing works)
router.get(
  '/daily-sales-person-report',
  requirePermission(REPORT_PERMISSION_CONSTANTS.DAILY_SALES_PERSON_REPORT.name),
  getDailySalesPersonReport
);

// Sales Activity Report — merges Daily Sales Person + Call Buddy data per user
router.get(
  '/sales-activity-report',
  requirePermission(REPORT_PERMISSION_CONSTANTS.SALES_ACTIVITY_REPORT.name),
  getSalesActivityReport
);

router.get(
  '/location-log-report',
  requirePermission(REPORT_PERMISSION_CONSTANTS.LOCATION_LOG_REPORT.name),
  getLocationLogReport
);
router.get(
  '/halt-points-report',
  requirePermission(REPORT_PERMISSION_CONSTANTS.HALT_POINTS_REPORT.name),
  getHaltPointsReport
);
router.get(
  '/identify-officer-report',
  requirePermission(REPORT_PERMISSION_CONSTANTS.IDENTIFY_OFFICER_REPORT.name),
  getIdentifyOfficerReport
);

// Field-sales reports (GPS tracking + dealer visits + wage)
router.get('/field-sales/daily', fieldSalesReports.getDailyReport);
router.get('/field-sales/monthly', fieldSalesReports.getMonthlyReport);
router.get('/field-sales/dealer', fieldSalesReports.getDealerReport);
router.get('/field-sales/detailed-dealer-form', fieldSalesReports.getDetailedDealerFormReport);
router.get('/field-sales/dealer-performance', fieldSalesReports.getDealerPerformanceReport);
router.get('/field-sales/new-potential-dealer', fieldSalesReports.getNewPotentialDealerReport);
router.get('/field-sales/best-worst-employees', fieldSalesReports.getBestWorstReport);
router.get('/field-sales/lead-follow-up', fieldSalesReports.getLeadFollowUpReport);
router.get('/field-sales/sales-trend', fieldSalesReports.getSalesTrendReport);
router.get('/field-sales/dealer-satisfaction', fieldSalesReports.getDealerSatisfactionReport);

registerCustomReportRoutes(router);

module.exports = router;
