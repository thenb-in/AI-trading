// In-process scheduled jobs for this app. Lifecycle (start/stop, logging,
// register-and-start) is handled by the framework — see
// startup/server/scheduler/index.js. This file declares which jobs the
// registry should run.
//
// Adding a new in-process job:
//   1. Write its business-logic function under app/server/scheduler/<feature>/
//      (one dir per feature is the convention).
//   2. Add a registerJob(...) call in registerAllJobs() below.
//   3. That's it — buildApp().startServer() picks the change up via the
//      registerSchedulerJobs option wired from app/server/index.js.

const { registerJob } = require('@startup/scheduler');

const { calculateWages } = require('./field_sales/wageScheduler');
const { calculateCallDurations } = require('./field_sales/callLogScheduler');
const { processRecentWindow } = require('./field_sales/addressScheduler');
const { runLongLeaveDeactivationOnce } = require('./leave_deactivation/leaveDeactivationScheduler');
const { runDailyAttendanceNotificationsOnce } = require('../src/services/daily_attendance_notification/dailyAttendanceNotification.service');
// NOTE: fieldSales.archiveTracking (raw tracking archive/cleanup) runs in the
// standalone wagemaster server now — it owns the high-volume tracking ingest +
// its data lifecycle. It MUST run in exactly one process, so it is intentionally
// not registered here. See wagemaster/index.js.
const { runOnce: runApprovedManualAttendanceSnapshotBackfillOnce } = require('./approved_manual_attendance_snapshot/run_backfill_once');
const { backfillFirstPunches } = require('../src/services/employment_period');
const { purgeExpiredReportRuns } = require('@startup/scheduler/report_runs/purgeReportRuns');

const {
  FIELD_SALES_WAGE_CRON,
  FIELD_SALES_CALL_LOG_CRON,
  FIELD_SALES_ADDRESS_CRON,
  LONG_LEAVE_DEACTIVATION_CRON,
  DAILY_ATTENDANCE_NOTIFICATION_CRON,
  APPROVED_MANUAL_ATTENDANCE_SNAPSHOT_BACKFILL_CRON,
  EMPLOYMENT_PERIOD_FIRST_PUNCH_CRON,
  REPORT_RUN_PURGE_CRON
} = require('../src/constants');

function registerAllJobs() {
  registerJob({
    name: 'fieldSales.wage',
    cronTime: FIELD_SALES_WAGE_CRON,
    run: () => calculateWages()
  });

  registerJob({
    name: 'fieldSales.callLog',
    cronTime: FIELD_SALES_CALL_LOG_CRON,
    run: () => calculateCallDurations()
  });

  registerJob({
    name: 'fieldSales.address',
    cronTime: FIELD_SALES_ADDRESS_CRON,
    run: () => processRecentWindow()
  });

  registerJob({
    name: 'employee.longLeaveDeactivation',
    cronTime: LONG_LEAVE_DEACTIVATION_CRON,
    run: () => runLongLeaveDeactivationOnce()
  });

  registerJob({
    name: 'attendance.dailySummaryNotification',
    cronTime: DAILY_ATTENDANCE_NOTIFICATION_CRON,
    run: () => runDailyAttendanceNotificationsOnce()
  });

  // Heals approved manual attendance rows whose att_data snapshot is null
  // (fire-and-forget population at approval time failed, or pre-existing
  // approvals from before the column was added). Read path falls through to
  // live compute for null rows so this is purely a perf-recovery pass.
  registerJob({
    name: 'manualAttendance.snapshotBackfill',
    cronTime: APPROVED_MANUAL_ATTENDANCE_SNAPSHOT_BACKFILL_CRON,
    run: () => runApprovedManualAttendanceSnapshotBackfillOnce()
  });

  // Records the first punch of each employment period so the employee master does not have
  // to search millions of punches to show it. Periods still open are refreshed each night —
  // somebody who joined today has not punched yet, and a late device sync can land a punch
  // earlier than the one already recorded. The read path computes anything still missing, so
  // this is a perf pass rather than a correctness one.
  registerJob({
    name: 'employmentPeriod.firstPunchBackfill',
    cronTime: EMPLOYMENT_PERIOD_FIRST_PUNCH_CRON,
    run: () => backfillFirstPunches()
  });

  // Saved report runs are a cache of a question asked on a particular day, and
  // their payload files are the biggest thing this application writes to disk.
  // Past the retention horizon both go.
  registerJob({
    name: 'reportRun.purge',
    cronTime: REPORT_RUN_PURGE_CRON,
    run: () => purgeExpiredReportRuns()
  });
}

module.exports = { registerAllJobs };
