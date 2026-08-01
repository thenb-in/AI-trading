// Report RPC over the shared session socket: ensure connected → emit → await ack.
// The socket stays alive between calls (connect-once model); it is only torn
// down by disconnectSocket() on logout.


import { ensureSocketReady } from './setup';
import { REPORT_RUN } from './events';

async function runReportViaSocket({ reportKey, filters }) {
  const socket = await ensureSocketReady();
  return new Promise((resolve, reject) => {
    socket.emit(REPORT_RUN, { reportKey, filters }, (response) => {
      if (!response || response.ok !== true) {
        return reject(new Error(response?.error || 'Report server returned an invalid response. Please try again.'));
      }
      resolve(response.data);
    });
  });
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

export { runReportViaSocket, runViaRunner };
