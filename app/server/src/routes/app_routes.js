// app_routes.js

const logger = require('@startup/logger');
const env = require('@startup/src/config/env');
const employeeRoutes = require('../routes/employeeRoutes');
const pastReportRoute = require('../routes/pastReportRoutes');
const holidayRoutes = require('../routes/holidayRoutes');
const FormulaRoutes = require('../routes/FormulaRoutes');

const reportRoutes = require('../routes/reportRoutes');
const reportActionRoutes = require('../routes/reportActionRoutes');
const rawPunchRoutes = require('../routes/rawPunchRoutes');
const canteenTokenRoutes = require('../routes/canteenTokenRoutes');
const gatepassRoutes = require('../routes/gatepassRoutes');
const departmentRoutes = require('../routes/departmentRoutes');
const positionRoutes = require('../routes/positionRoutes');
const leaveTypeRoutes = require('../routes/leaveTypeRoutes');
const allowanceTypeRoutes = require('../routes/allowanceTypeRoutes');
const purposeTypeRoutes = require('../routes/purposeTypeRoutes');
const serviceOfferingRoutes = require('../routes/serviceOfferingRoutes');
const customerRoutes = require('../routes/customerRoutes');
const workorderRoutes = require('../routes/workorderRoutes');
const leavesTakenRoutes = require('../routes/leavesTakenRoutes');
const leaveListRoutes = require('../routes/leaveListRoutes');
const employeeMergeRoutes = require('../routes/employeeMergeRoutes');
const timetableRoutes = require('../routes/timetableRoutes');
const reportActionRoutesNode = require('../routes/reportActionRoutes(Node)');
const manualLogRoutes = require('../routes/manualLogRoutes');
const manualLogEntryMasterRoutes = require('../routes/manualLogEntryMasterRoutes');
const employeeScheduleRoutes = require('../routes/employeeSchedule');
const departmentScheduleRoutes = require('../routes/departmentScheduleRoutes');
const shiftRoutes = require('../routes/shiftRoute');
const compoundShiftRoutes = require('../routes/compoundShiftRoutes');
const holidayTypeRoutes = require('../routes/holidayTypeRoutes');
const holidayDayRoutes = require('../routes/holidayDayRoutes');
const manualAttendanceRoutes = require('../routes/manualAttendanceRoutes');
const layoutRoutes = require('@startup/src/routes/layoutRoutes');
const reimbursementRoutes = require('../routes/reimbursementRoutes');
const advanceRoutes = require('../routes/advanceRoutes');
const dataAccessRoutes = require('./dataAccess.routes');
const locationRoutes = require('../routes/locationRoutes');
const contactRoutes = require('../routes/contactRoutes');
const callBuddyRoutes = require('../routes/callBuddyRoutes');
const whatsappTemplateRoutes = require('../routes/whatsappTemplateRoutes');
const jobOfferSalaryStructureRoutes = require('../routes/jobOfferSalaryStructureRoutes');
const salaryStructureRoutes = require('../routes/salaryStructureRoutes');
const djangoRoutes = require('../routes/djangoRoutes');

const wageMasterRoutes = require('../routes/wageMasterRoutes');
const weeklyOffRoutes = require('../routes/weeklyOffRoutes');
const employeeWeeklyOffRoutes = require('../routes/employeeWeeklyOffRoutes');
const departmentWeeklyOffRoutes = require('../routes/departmentWeeklyOffRoutes');
const iclockTerminalRoutes = require('../routes/iclockTerminalRoutes');
const zktecoTerminalCommandRoutes = require('../routes/zktecoTerminalCommandRoutes');
const checkInRoutes = require('../routes/checkInRoutes');
const hrDashboardRoutes = require('../routes/hrDashboardRoutes');
const costCenterRoutes = require('../routes/costCenterRoutes');
// ADMS admin queue API. The authenticated routes (framework auth middleware)
// live here in app/server; they drive the command queue via the ADMS service
// resolved from adms_server through the @adms alias. Frontend hits
// /api/v1/adms-queue/* on app/server. Devices + auto-sync run in adms_server.
const admsQueueRoutes = require('../routes/admsQueueRoutes');
const personnelAreaRoutes = require('../routes/personnelAreaRoutes');
// Internal service-to-service API (shared-secret, not user-JWT). The standalone
// biometric gateways POST here to resolve/create HR Employee shells.
const internalRoutes = require('../routes/internalRoutes');

// export a function that takes in app and returns the app with the routes
const appRoutes = (app, prefix) => {
  // todo: should protect these routes with auth middleware?

  // todo: automatically add prefix to app routes
  // current routes in app route need to manually add prefix
  // Health check endpoint

  // const authRoutes = require('../routes/startup/authRoutes');
  // const userRoutes = require('../routes/startup/userRoutes');
  // const companyRoutes = require('../routes/startup/companyRoutes');
  // const adminRoutes = require('../routes/startup/admin.route');
  app.get(`${prefix}/health`, (req, res) => {
    logger.info(`2. Health check endpoint called: ${req.url}`);
    const healthData = {
      message: 'NB Next Server is running',
      status: 'OK',
      timestamp: new Date().toISOString(),
      environment: env.NODE_ENV,
      version: '2.0.0',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      pid: process.pid
    };

    const healthIp = req.ip || req.connection.remoteAddress;
    const healthUserAgent = req.get('User-Agent');
    logger.info(`Health Check: NB Next Server is running ip=${healthIp}, userAgent=${healthUserAgent}`);

    res.json(healthData);
  });

  app.get(`${prefix}/test`, (req, res) => {
    // use req to get the url
    logger.info(`Request received for ${req.url}`);
    res.send('Custom implementation of the app routes');
  });



  // app.use('${prefix}/auth', authRoutes);
  // app.use('${prefix}/v1/auth', authRoutes);
  // app.use('${prefix}/v1/users', userRoutes);
  // app.use('${prefix}/v1/company', companyRoutes);
  // app.use('${prefix}/v1/admin', adminRoutes);


  app.use(`${prefix}/employees`, employeeRoutes);
  // Compatibility alias (some clients call singular /employee/*)
  app.use(`${prefix}/employee`, employeeRoutes);
  app.use(`${prefix}/pastreport`, pastReportRoute);
  app.use(`${prefix}/holidays`, holidayRoutes);
  app.use(`${prefix}/formulas`, FormulaRoutes);
  // app.use('${prefix}/admin', AdminRoutes)
  app.use(`${prefix}/gatepass`, gatepassRoutes);
  app.use(`${prefix}/department`, departmentRoutes);
  app.use(`${prefix}/position`, positionRoutes);
  app.use(`${prefix}/leave-type`, leaveTypeRoutes);
  app.use(`${prefix}/allowance-type`, allowanceTypeRoutes);
  app.use(`${prefix}/purpose-type`, purposeTypeRoutes);
  app.use(`${prefix}/service-offering`, serviceOfferingRoutes);
  app.use(`${prefix}/customer`, customerRoutes);
  app.use(`${prefix}/workorder`, workorderRoutes);
  app.use(`${prefix}/leaves-taken`, leavesTakenRoutes);
  app.use(`${prefix}/leave-list`, leaveListRoutes);
  app.use(`${prefix}/employee-merge`, employeeMergeRoutes);
  app.use(`${prefix}/timetable`, timetableRoutes);
  app.use(`${prefix}/report-actions`, reportActionRoutesNode);
  app.use(`${prefix}/manual-log`, manualLogRoutes);
  app.use(`${prefix}/manual-log-entry-master`, manualLogEntryMasterRoutes);
  app.use(`${prefix}/manual-attendance`, manualAttendanceRoutes);
  app.use(`${prefix}/employee-schedule`, employeeScheduleRoutes);
  app.use(`${prefix}/department-schedule`, departmentScheduleRoutes);
  app.use(`${prefix}/shifts`, shiftRoutes);
  app.use(`${prefix}/compound-shift`, compoundShiftRoutes);
  app.use(`${prefix}/holiday-type`, holidayTypeRoutes);
  app.use(`${prefix}/holiday-days`, holidayDayRoutes);
  app.use(`${prefix}/reimbursements`, reimbursementRoutes);
  app.use(`${prefix}/advance`, advanceRoutes);

  app.use(`${prefix}/report-actions`, reportActionRoutes);
  app.use(`${prefix}/django`, djangoRoutes);
  app.use(`${prefix}/reports`, reportRoutes);
  app.use(`${prefix}/raw-punch`, rawPunchRoutes);
  app.use(`${prefix}/canteen-token`, canteenTokenRoutes);
  app.use(`${prefix}/layouts`, layoutRoutes);
  app.use(`${prefix}/data-access`, dataAccessRoutes);


  // location api
  app.use(`${prefix}/location`, locationRoutes);

  // contact master (base master pattern)
  app.use(`${prefix}/contact`, contactRoutes);

  //callbuddy api
  app.use(`${prefix}/callbuddy`, callBuddyRoutes);
  app.use(`${prefix}/whatsapp-template`, whatsappTemplateRoutes);
  app.use(`${prefix}/job-offer-salary-structure`, jobOfferSalaryStructureRoutes);
  app.use(`${prefix}/salary-structure`, salaryStructureRoutes);
  app.use(`${prefix}/wagemaster`, wageMasterRoutes);
  app.use(`${prefix}/weekly-off`, weeklyOffRoutes);
  app.use(`${prefix}/employee-weekly-off`, employeeWeeklyOffRoutes);
  app.use(`${prefix}/department-weekly-off`, departmentWeeklyOffRoutes);
  app.use(`${prefix}/iclock-terminal`, iclockTerminalRoutes);
  app.use(`${prefix}/terminal-commands`, zktecoTerminalCommandRoutes);
  app.use(`${prefix}/check-in`, checkInRoutes);
  app.use(`${prefix}/hr-dashboard`, hrDashboardRoutes);
  app.use(`${prefix}/cost-center`, costCenterRoutes);
  app.use(`${prefix}/adms-queue`, admsQueueRoutes);
  app.use(`${prefix}/personnel-areas`, personnelAreaRoutes);
  app.use(`${prefix}/internal`, internalRoutes);

  logger.info(`App routes loaded at ${Date.now()}`);
};

module.exports = appRoutes;
