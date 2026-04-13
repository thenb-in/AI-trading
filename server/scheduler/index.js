// Scheduler entry point.
//
// This file re-exports the generic scheduler infrastructure.
// App-specific job registrations go OUTSIDE the startup/ folder,
// typically in server/scheduler/<feature>/index.js, and should be
// required from server/index.js BEFORE calling startAllJobs().
//
// Example wiring in server/index.js:
//
//   const { startAllJobs, stopAllJobs } = require('./scheduler');
//
//   // Register app-specific jobs (these files call registerJob internally)
//   require('./scheduler/myFeature');       // ← app-specific, outside startup
//
//   // After DB is ready:
//   db.sequelize.authenticate().then(() => {
//     startAllJobs();
//   });
//
//   // On graceful shutdown:
//   process.on('SIGTERM', async () => {
//     stopAllJobs();
//     await db.sequelize.close();
//     process.exit(0);
//   });

const { registerJob, startAllJobs, stopAllJobs, _resetForTests } = require('./lib/jobRegistry');
const { createStandaloneScheduler, runOnceStandalone } = require('./lib/standaloneSchedulerFactory');

module.exports = {
  registerJob,
  startAllJobs,
  stopAllJobs,
  _resetForTests,
  createStandaloneScheduler,
  runOnceStandalone
};
