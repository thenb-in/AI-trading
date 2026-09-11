// Tell whoever is listening that a run reached a terminal state.
//
// Every completed run is announced here, whether it was dispatched or picked up
// from the queue after a restart. The listener turns the announcement into the
// user's notification, so resumed work is announced exactly like dispatched work
// instead of finishing silently.
//
// Two processes set the sink, and the core does not care which: the standalone
// report-runner emits the announcement over its socket to the app server; the
// app server running the core in-process hands it straight to the same
// finished-run handler the socket would have delivered it to.
//
// Fire and forget: if nothing is listening the run is still correct in the
// database, and the Reporting Manager will show it. Only the live notification
// is lost, which is not worth holding up the queue for.

const logger = require('@startup/logger');

let _announce = null;

function setAnnouncer(announce) {
  _announce = announce;
}

function announceRunFinished({ runId, status, error = null }) {
  if (!_announce) {
    logger.debug(`[report-runner] no announcer set for run ${runId}`);
    return;
  }
  _announce({ runId, status, error });
}

module.exports = { setAnnouncer, announceRunFinished };
