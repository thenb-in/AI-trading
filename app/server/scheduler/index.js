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
const { runNoPunchDeactivationOnce } = require('./no_punch_deactivation/noPunchDeactivationScheduler');
const { runDailyAttendanceNotificationsOnce } = require('../src/services/daily_attendance_notification/dailyAttendanceNotification.service');
const { runTerminalHealthNotificationsOnce } = require('../src/services/terminal_health_notification/terminalHealthNotification.service');
const { TERMINAL_HEALTH_NOTIFICATION_CRON } = require('../src/constants/terminalHealthNotifications');
// NOTE: fieldSales.archiveTracking (raw tracking archive/cleanup) runs in the
// standalone wagemaster server now — it owns the high-volume tracking ingest +
// its data lifecycle. It MUST run in exactly one process, so it is intentionally
// not registered here. See wagemaster/index.js.
const { runOnce: runApprovedManualAttendanceSnapshotBackfillOnce } = require('./approved_manual_attendance_snapshot/run_backfill_once');
const { runNtResetOnce } = require('./call_buddy/ntResetScheduler');
const { backfillFirstPunches } = require('../src/services/employment_period');
const { purgeExpiredReportRuns } = require('@startup/scheduler/report_runs/purgeReportRuns');
const { runPerformanceCycleGenerationOnce } = require('./performance_cycles/performanceCycleScheduler');
const { runPerformanceReviewRemindersOnce } = require('./performance_reviews/performanceReviewReminderScheduler');

const {
  FIELD_SALES_WAGE_CRON,
  FIELD_SALES_CALL_LOG_CRON,
  FIELD_SALES_ADDRESS_CRON,
  NO_PUNCH_DEACTIVATION_CRON,
  DAILY_ATTENDANCE_NOTIFICATION_CRON,
  APPROVED_MANUAL_ATTENDANCE_SNAPSHOT_BACKFILL_CRON,
  CALL_BUDDY_NT_RESET_CRON,
  EMPLOYMENT_PERIOD_FIRST_PUNCH_CRON,
  REPORT_RUN_PURGE_CRON,
  PERFORMANCE_CYCLE_GENERATION_CRON,
  PERFORMANCE_REVIEW_REMINDER_CRON
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
    name: 'employee.noPunchDeactivation',
    cronTime: NO_PUNCH_DEACTIVATION_CRON,
    run: () => runNoPunchDeactivationOnce()
  });

  registerJob({
    name: 'attendance.dailySummaryNotification',
    cronTime: DAILY_ATTENDANCE_NOTIFICATION_CRON,
    run: () => runDailyAttendanceNotificationsOnce()
  });

  registerJob({
    name: 'terminal.healthNotification',
    cronTime: TERMINAL_HEALTH_NOTIFICATION_CRON,
    run: () => runTerminalHealthNotificationsOnce()
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

  registerJob({
    name: 'callBuddy.ntReset',
    cronTime: CALL_BUDDY_NT_RESET_CRON,
    run: () => runNtResetOnce()
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

  // A monthly review cadence means twelve rounds a year somebody has to type in, and the
  // month nobody does is the month the reviews inside them never happen. This opens the ones
  // that have come due, as drafts — the same thing the Generate Cycles button does, so a
  // round created overnight is indistinguishable from one created by hand.
  registerJob({
    name: 'performanceCycle.generateDue',
    cronTime: PERFORMANCE_CYCLE_GENERATION_CRON,
    run: () => runPerformanceCycleGenerationOnce()
  });

  // A deadline nobody is told about is a date in a database. This chases whoever a round is
  // waiting on — the employee who owes a self appraisal, the manager who owes a score — a few
  // days out, on the day, and weekly after that until they have done it.
  registerJob({
    name: 'performanceReview.dueReminders',
    cronTime: PERFORMANCE_REVIEW_REMINDER_CRON,
    run: () => runPerformanceReviewRemindersOnce()
  });
}

module.exports = { registerAllJobs };
