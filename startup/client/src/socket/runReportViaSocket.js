// Report RPC over the shared session socket: ensure connected → emit → await ack.
// The socket stays alive between calls (connect-once model); it is only torn
// down by disconnectSocket() on logout.
//
// Two modes on the same event:
//
//   default    — the ack carries the report itself. Used by the HR dashboard
//                tiles and the punch reminder, which want many small payloads
//                back immediately and have nothing to save.
//   save: true — the ack carries only a runId; the report is computed in the
//                background, kept, and announced on REPORT_RUN_DONE. Used by the
//                report pages, where a run can take minutes and is worth keeping.


import { ensureSocketReady } from './setup';
import { REPORT_RUN, REPORT_RUN_DONE } from './events';
import {
  REPORT_RUN_STARTED_EVENT,
  REPORT_RUN_STATUS,
  REPORT_RUNNER_UNAVAILABLE,
} from '@startup/constants/reportRuns';

/**
 * Why a wait for a run ended without rows.
 *
 * A run that was stopped is not a failure — someone pressed stop — so it says so
 * and carries a flag, letting callers tell the user calmly instead of reporting
 * an error they caused on purpose.
 */
function completionError(payload) {
  const runCancelled = payload?.status === REPORT_RUN_STATUS.CANCELLED;
  const error = new Error(
    payload?.error
    || (runCancelled ? 'This report run was stopped.' : 'Report run failed. Please try again.')
  );
  error.runCancelled = runCancelled;
  return error;
}

// Announce a newly queued run to this tab. The activity strip picks it up and
// shows the run immediately; completion comes over the socket, so neither side
// has to poll.
function announceStarted(runId) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(REPORT_RUN_STARTED_EVENT, { detail: { runId } }));
}

async function runReportViaSocket({ reportKey, filters, save = false, reportTitle }) {
  const socket = await ensureSocketReady();
  return new Promise((resolve, reject) => {
    socket.emit(REPORT_RUN, { reportKey, filters, save, reportTitle }, (response) => {
      if (!response || response.ok !== true) {
        const message = response?.error || 'Report server returned an invalid response. Please try again.';
        const error = new Error(message);
        // No runner connected is a state of the world, not a fault. Background
        // callers skip the round rather than reporting a failure; anything
        // user-initiated still surfaces it.
        error.runnerUnavailable = message.startsWith(REPORT_RUNNER_UNAVAILABLE);
        return reject(error);
      }
      resolve(response.data);
    });
  });
}

/**
 * Start a saved run and return its id without waiting for the result. The user
 * finds out it finished through the notification bell.
 */
async function enqueueSavedReportRun({ reportKey, filters, reportTitle }) {
  const { runId } = await runReportViaSocket({ reportKey, filters, save: true, reportTitle });
  announceStarted(runId);
  return runId;
}

/**
 * Start a saved run and resolve when it finishes.
 *
 * The completion listener is attached *before* the run is enqueued, and
 * completions that arrive before the ack are buffered. Without that, a report
 * that finishes in under a round trip would announce itself into the void and
 * this promise would hang forever.
 */
async function runSavedReportToCompletion({ reportKey, filters, reportTitle }) {
  const socket = await ensureSocketReady();

  let settle = null;
  const early = [];
  const onDone = (payload) => {
    if (settle) {
      settle(payload);
      return;
    }
    early.push(payload);
  };
  socket.on(REPORT_RUN_DONE, onDone);

  try {
    const { runId, dispatched } = await runReportViaSocket({ reportKey, filters, save: true, reportTitle });
    announceStarted(runId);

    // The run is recorded either way, but with the report server down there is
    // nothing to wait for right now — it runs when a runner next starts, and the
    // bell says so. Waiting here would spin indefinitely.
    if (dispatched === false) {
      throw new Error('The report server is offline. Your report is queued and will run when it is back — you will be notified.');
    }

    const completion = early.find((p) => String(p?.runId) === String(runId))
      ?? await new Promise((resolve) => {
        settle = (payload) => {
          if (String(payload?.runId) === String(runId)) {
            resolve(payload);
          }
        };
      });

    if (completion.status !== REPORT_RUN_STATUS.DONE) {
      throw completionError(completion);
    }
    return { runId, ...completion };
  } finally {
    socket.off(REPORT_RUN_DONE, onDone);
  }
}

/**
 * Wait for one already-started run to finish.
 *
 * Used when opening a run that is still computing: the page has nothing to show
 * yet, so it subscribes and fills in when the result lands. Subscribe before
 * checking the run's status, or a run that finishes in between is waited on
 * forever.
 */
async function awaitReportRunById(runId) {
  const socket = await ensureSocketReady();
  let settle = null;
  const onDone = (payload) => {
    if (String(payload?.runId) !== String(runId)) return;
    settle?.(payload);
  };
  socket.on(REPORT_RUN_DONE, onDone);

  const finished = new Promise((resolve, reject) => {
    settle = (payload) => {
      socket.off(REPORT_RUN_DONE, onDone);
      if (payload.status !== REPORT_RUN_STATUS.DONE) {
        reject(completionError(payload));
        return;
      }
      resolve(payload);
    };
  });

  return { finished, cancel: () => socket.off(REPORT_RUN_DONE, onDone) };
}

/**
 * Listen for any saved run of this user's finishing. Returns an unsubscribe.
 * Used by views that track run activity rather than awaiting one specific run.
 */
async function subscribeToReportRunDone(onDone) {
  const socket = await ensureSocketReady();
  socket.on(REPORT_RUN_DONE, onDone);
  return () => socket.off(REPORT_RUN_DONE, onDone);
}

async function runViaRunner(reportKey, filters = {}) {
  try {
    const envelope = await runReportViaSocket({ reportKey, filters });
    const payload = envelope?.data ?? envelope;
    return { data: { success: true, data: payload } };
  } catch (err) {
    console.error(`[runner] ${reportKey} failed:`, err?.message || err);
    throw err;
  }
}

export {
  runReportViaSocket,
  runViaRunner,
  enqueueSavedReportRun,
  runSavedReportToCompletion,
  subscribeToReportRunDone,
  awaitReportRunById,
};
