// Per-call socket lifecycle: connect → emit → await ack → disconnect.


import { ensureSocketReady, disconnectSocket } from './setup';
import { REPORT_RUN } from './events';

async function runReportViaSocket({ reportKey, filters }) {
  try {
    const socket = await ensureSocketReady();
    return await new Promise((resolve, reject) => {
      socket.emit(REPORT_RUN, { reportKey, filters }, (response) => {
        if (!response || response.ok !== true) {
          return reject(new Error(response?.error || 'SOCKET_RPC_ERROR'));
        }
        resolve(response.data);
      });
    });
  } finally {
    disconnectSocket();
  }
}

export { runReportViaSocket };
