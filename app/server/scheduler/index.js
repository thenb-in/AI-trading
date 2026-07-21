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

// const { registerJob } = require('@startup/scheduler');

function registerAllJobs() {
  // registerJob({
  //   // Unique job name
  //   name: '<feature>.<jobName>',
  //   // Cron expression or cron constant
  //   cronTime: '<CRON_EXPRESSION>',
  //   // Function to execute
  //   run: () => {
  //     // TODO: Call your job function
  //   }
  // });
}


module.exports = { registerAllJobs };
