// Tell the app server a run reached a terminal state.
//
// Every completed run is announced here, whether the app server asked for it or
// this process picked it up from the queue after a restart. The app server turns
// the announcement into the user's notification, so resumed work is announced
// exactly like dispatched work instead of finishing silently.
//
// Fire and forget: if no app server is connected the run is still correct in the
// database, and the Reporting Manager will show it. Only the live notification
// is lost, which is not worth holding up the queue for.

const logger = require('@startup/logger');
const { REPORT_RUN_FINISHED } = require('@startup/src/constants/socketEvent');

let _io = null;

function setAnnouncer(io) {
  _io = io;
}

function announceRunFinished({ runId, status, error = null }) {
  if (!_io) {
    logger.debug(`[report-runner] no socket server to announce run ${runId}`);
    return;
  }
  _io.emit(REPORT_RUN_FINISHED, { runId, status, error });
}

module.exports = { setAnnouncer, announceRunFinished };
