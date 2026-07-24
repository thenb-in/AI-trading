// Per-call socket lifecycle: acquire (connect) → emit → await ack → release.
// Ref-counted so concurrent callers share one connection; the socket is only
// torn down when the last in-flight call releases it.


import { resolveReportParams } from '@startup/data/reportParamsRegistry';
import { ensureSocketReady } from './setup';
import { REPORT_RUN } from './events';

async function runReportViaSocket({ reportKey, filters }) {

  const params = resolveReportParams(reportKey, filters);
  const socket = await ensureSocketReady();
  return new Promise((resolve, reject) => {
    socket.emit(REPORT_RUN, { reportKey, filters: params }, (response) => {
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
