module.exports = {
  // Client → app server: run a report. Synchronous by default; with `save: true`
  // it records the run, acks a runId immediately and finishes in the background.
  REPORT_RUN: 'report:run',
  // App server → the requesting user's room: a saved run has finished.
  REPORT_RUN_DONE: 'report:run:done',
  // App server → runner: stop this run. The row is already cancelled by the time
  // this goes out, so it is only about the work in flight — dropping the job if
  // it is still waiting for a slot, and cutting its queries short if it is not.
  REPORT_RUN_CANCEL: 'report:run:cancel',
  // Runner → app server: a saved run reached a terminal state. Announced for
  // every run the runner completes, whether the app server dispatched it or the
  // runner picked it up from the queue after a restart, so there is one path to
  // "tell the user" rather than one per origin.
  REPORT_RUN_FINISHED: 'report:run:finished'
};

