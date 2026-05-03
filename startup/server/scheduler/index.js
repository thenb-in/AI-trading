// Scheduler entry point.
//
// Two layers exposed:
//
//   - Primitives  (registerJob, startAllJobs, stopAllJobs)
//     For when you want to drive the registry directly.
//
//   - Lifecycle   (startAllSchedulers, stopAllSchedulers)
//     Used by buildApp().startServer() to register-and-start in one shot.
//     `startAllSchedulers(registerFn)` calls registerFn() (typically the
//     app's `registerAllJobs`) then `startAllJobs()`. Both wrappers log a
//     single line each so the systemd journal has a clear lifecycle marker.
//
// App-specific job registrations live OUTSIDE the startup/ folder — by
// convention `app/server/scheduler/index.js` exports `registerAllJobs` and
// the app's `index.js` passes it to `buildApp({ registerSchedulerJobs })`.

const logger = require('../logger');
const { registerJob, startAllJobs, stopAllJobs, _resetForTests } = require('./lib/jobRegistry');
const { createStandaloneScheduler, runOnceStandalone } = require('./lib/standaloneSchedulerFactory');

function startAllSchedulers(registerFn) {
  if (typeof registerFn === 'function') {
    try {
      registerFn();
    } catch (err) {
      logger.error(`scheduler: failed to register jobs: ${err.message}`, err);
      throw err;
    }
  }
  startAllJobs();
  logger.info(`scheduler: all in-process schedulers started at ${new Date().toISOString()}`);
}

function stopAllSchedulers() {
  stopAllJobs();
  logger.info(`scheduler: all in-process schedulers stopped at ${new Date().toISOString()}`);
}

module.exports = {
  registerJob,
  startAllJobs,
  stopAllJobs,
  startAllSchedulers,
  stopAllSchedulers,
  _resetForTests,
  createStandaloneScheduler,
  runOnceStandalone
};
