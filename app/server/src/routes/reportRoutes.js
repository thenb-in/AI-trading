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
const { getUnregisteredFacesReport, deleteUnregisteredFace, assignUnregisteredFace } = require('../views/reports/unregisteredFacesReport');
const { getBiotemplateReport, registerBiotemplate, pushBiotemplate, deleteBiotemplate } = require('../views/reports/biotemplateReport');

// Field-sales report handlers (daily/monthly/dealer + analytics + halt points)
const fieldSalesReports = require('../views/reports/field_sales');
const { getCallBuddyReport } = require('../views/reports/callBuddyReport');
const { getFinalWageReportForContractor } = require('../views/reports/finalWageReportForContractor');
const { getDailySalesPersonReport } = require('../views/reports/dailySalesPersonReport');
const { getSalesActivityReport } = require('../views/reports/salesActivityReport');
const { getVastramDailyPerformanceReport } = require('../views/reports/vastramDailyPerformanceReport');
const { getCanteenReport } = require('../views/reports/canteenReport');
// Readiness reports — the data-quality gates the checklist reads from.
const readinessReports = require('../views/reports/readiness');
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

// Readiness reports. Each is guarded by its own permission — payroll readiness
// exposes bank and statutory numbers that roster coverage does not, so they
// are not granted together by accident.
router.get('/payroll-readiness-report', requirePermission(REPORT_PERMISSION_CONSTANTS.PAYROLL_READINESS_REPORT.name), readinessReports.getPayrollReadinessReport);
router.get('/roster-coverage-report',   requirePermission(REPORT_PERMISSION_CONSTANTS.ROSTER_COVERAGE_REPORT.name),   readinessReports.getRosterCoverageReport);
router.get('/pending-approvals-report', requirePermission(REPORT_PERMISSION_CONSTANTS.PENDING_APPROVALS_REPORT.name), readinessReports.getPendingApprovalsReport);
router.get('/terminal-health-report',   requirePermission(REPORT_PERMISSION_CONSTANTS.TERMINAL_HEALTH_REPORT.name),   readinessReports.getTerminalHealthReport);
router.get('/advance-recovery-report',  requirePermission(REPORT_PERMISSION_CONSTANTS.ADVANCE_RECOVERY_REPORT.name),  readinessReports.getAdvanceRecoveryReport);
router.get('/call-buddy-report', getCallBuddyReport);
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
router.get('/field-sales/halt-points', fieldSalesReports.getHaltPointsReport);

registerCustomReportRoutes(router);

module.exports = router;
