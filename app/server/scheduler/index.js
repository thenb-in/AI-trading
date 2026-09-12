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
//
// Empty in the reference scaffold — apps register their own jobs, e.g.
//
//   const { purgeExpiredReportRuns } = require('@startup/scheduler/report_runs/purgeReportRuns');
//
//   registerJob({
//     name: 'reportRun.purge',
//     cronTime: REPORT_RUN_PURGE_CRON,   // from this app's own constants
//     run: () => purgeExpiredReportRuns()
//   });

// eslint-disable-next-line no-unused-vars
const { registerJob } = require('@startup/scheduler');

function registerAllJobs() {
}

module.exports = { registerAllJobs };
