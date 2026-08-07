import { ApiService } from './ApiService';

/**
 * Take back a batch: the server reads the ids that batch wrote from the
 * activity log and deletes them with the master's own delete.
 */
const undoService = {
  undoBatch(batchId) {
    return ApiService.request('POST', `/activity/undo/${encodeURIComponent(batchId)}`);
  }
};

export { undoService };
