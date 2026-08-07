import { ApiService } from './ApiService';

// Saved report runs — the Reporting Manager's data source.
//
// getPayload returns the stored { columns, data } straight from disk. The server
// sends it gzipped with Content-Encoding set, so the browser inflates it and
// axios hands back plain JSON; nothing here has to know it was compressed.
const reportRunService = {
  async list({ limit = 100, offset = 0 } = {}) {
    return ApiService.request('GET', `/report-runs?limit=${limit}&offset=${offset}`);
  },

  async get(id) {
    const response = await ApiService.request('GET', `/report-runs/${id}`);
    return response.data?.data?.run ?? null;
  },

  async getPayload(id) {
    const response = await ApiService.request('GET', `/report-runs/${id}/payload`);
    return response.data;
  },

  // Stop a run that is still queued or running. Rejects if it already finished,
  // which is the honest answer: there is nothing left to stop.
  async cancel(id) {
    return ApiService.request('POST', `/report-runs/${id}/cancel`);
  },

  async remove(id) {
    return ApiService.request('DELETE', `/report-runs/${id}`);
  }
};

export { reportRunService };
