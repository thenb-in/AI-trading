const { Op } = require('sequelize');
const { ReportRun } = require('../models');
const {
  REPORT_RUN_STATUS,
  REPORT_RUN_ACTIVE_STATUSES,
  REPORT_RUN_SOURCE,
  REPORT_RUN_LIST_LIMIT
} = require('../constants/reportRuns');

// Everything the Reporting Manager list needs. payloadPath is deliberately out:
// it is an internal filesystem detail, and the list must never be tempted to
// read payloads to render a row.
const LIST_ATTRIBUTES = [
  'id', 'reportKey', 'reportTitle', 'filters', 'status', 'source',
  'rowCount', 'columnCount', 'errorMessage',
  'startedAt', 'finishedAt', 'createdAt'
];

const ACTIVE_STATUS_FILTER = { [Op.in]: REPORT_RUN_ACTIVE_STATUSES };

const reportRunService = {
  async create({ companyId, userId, reportKey, reportTitle, filters, source = REPORT_RUN_SOURCE.FRONTEND }) {
    return ReportRun.create({
      companyId,
      userId,
      reportKey,
      reportTitle: reportTitle || reportKey,
      filters: filters || {},
      status: REPORT_RUN_STATUS.QUEUED,
      source
    });
  },

  /**
   * Finish a run this worker holds. Scoped to status='running' for the same
   * reason claiming is scoped to 'queued': it is the worker's half of the lock.
   * A run cancelled while it was computing has already left 'running', so this
   * updates nothing and the caller learns its result is unwanted.
   */
  async markDone(id, { driveFileId, rowCount, columnCount }) {
    const [count] = await ReportRun.update(
      {
        status: REPORT_RUN_STATUS.DONE,
        driveFileId,
        rowCount,
        columnCount,
        finishedAt: new Date()
      },
      { where: { id, status: REPORT_RUN_STATUS.RUNNING } }
    );
    return count > 0;
  },

  /**
   * Stop a run at the user's request. Only queued and running rows move: asking
   * to stop a report that just finished should leave the result you now have,
   * and the caller is told nothing changed.
   *
   * Cancelling a queued run is the whole stop — the claim that would have
   * started it matches status='queued' and will no longer find it, so neither a
   * live dispatch nor a restart sweep can pick it up afterwards.
   */
  async cancel(id, companyId) {
    if (!id || !companyId) {
      return false;
    }
    const [count] = await ReportRun.update(
      { status: REPORT_RUN_STATUS.CANCELLED, finishedAt: new Date() },
      { where: { id, companyId, status: ACTIVE_STATUS_FILTER } }
    );
    return count > 0;
  },

  /**
   * Put runs that were mid-compute back in the queue.
   *
   * A row only says "running" while a worker holds it, so finding one at runner
   * boot means the worker that held it is gone. The work itself is still wanted,
   * and the row carries everything needed to redo it, so it goes back to queued
   * rather than being failed.
   *
   * Assumes a single runner. With several, this would reset rows a sibling is
   * legitimately working on, and claiming would need a worker identity.
   */
  async requeueStaleRunning() {
    const [count] = await ReportRun.update(
      { status: REPORT_RUN_STATUS.QUEUED, startedAt: null },
      { where: { status: REPORT_RUN_STATUS.RUNNING } }
    );
    return count;
  },

  /**
   * Take ownership of a queued run. The queued → running transition is the lock:
   * only the update that matches status='queued' wins, so a boot sweep and a
   * live dispatch racing for the same row cannot both compute it.
   *
   * Returns true if this caller claimed it.
   */
  async claimQueuedRun(id) {
    const [count] = await ReportRun.update(
      { status: REPORT_RUN_STATUS.RUNNING, startedAt: new Date() },
      { where: { id, status: REPORT_RUN_STATUS.QUEUED } }
    );
    return count > 0;
  },

  /**
   * Runs still waiting to be computed, oldest first — the work the runner picks
   * up when it starts. Across all companies: this is the runner's queue, not a
   * user-facing list.
   */
  async listPendingRuns() {
    return ReportRun.findAll({
      where: { status: REPORT_RUN_STATUS.QUEUED },
      attributes: ['id', 'reportKey', 'filters', 'companyId', 'userId'],
      order: [['created_at', 'ASC']]
    });
  },

  // Same scoping as markDone: a run that was stopped mid-compute fails its own
  // queries on the way out, and that error must not overwrite "cancelled" with
  // "failed" — the user stopped it, nothing broke.
  async markFailed(id, errorMessage) {
    const [count] = await ReportRun.update(
      {
        status: REPORT_RUN_STATUS.FAILED,
        errorMessage: String(errorMessage || 'Unknown error').slice(0, 2000),
        finishedAt: new Date()
      },
      { where: { id, status: REPORT_RUN_STATUS.RUNNING } }
    );
    return count > 0;
  },

  async listForUser(userId, companyId, { limit = REPORT_RUN_LIST_LIMIT, offset = 0 } = {}) {
    if (!userId || !companyId) {
      return [];
    }
    return ReportRun.findAll({
      where: { userId, companyId },
      attributes: LIST_ATTRIBUTES,
      order: [['created_at', 'DESC']],
      limit: Number(limit),
      offset: Number(offset)
    });
  },

  /**
   * A run by id with no company scope. Only for server-to-server paths that have
   * no user context — the runner announcing a finished run, where the row itself
   * is what says which company and user it belongs to. Never reachable from a
   * request; request paths use getById.
   */
  async getByIdUnscoped(id) {
    return ReportRun.findByPk(id);
  },

  // Every read of a single run is company-scoped, so a guessed id from another
  // tenant resolves to nothing rather than to someone else's payroll figures.
  async getById(id, companyId) {
    if (!id || !companyId) {
      return null;
    }
    return ReportRun.findOne({ where: { id, companyId } });
  },

  async destroyById(id, companyId) {
    return ReportRun.destroy({ where: { id, companyId } });
  },

  /**
   * Delete runs older than `days`. Returns a Drive reference for everything that
   * went, so the caller can hand them to Drive for deletion — the rows are
   * cheap, the payloads are what actually fills the disk.
   */
  async purgeOlderThan(days) {
    const cutoff = new Date(Date.now() - Number(days) * 24 * 60 * 60 * 1000);
    const doomed = await ReportRun.findAll({
      where: { createdAt: { [Op.lt]: cutoff } },
      attributes: ['id', 'driveFileId', 'companyId', 'userId']
    });
    if (doomed.length === 0) {
      return { deletedCount: 0, payloadFiles: [] };
    }
    const ids = doomed.map((row) => row.id);
    const payloadFiles = doomed
      .filter((row) => row.driveFileId)
      .map((row) => ({ driveFileId: row.driveFileId, companyId: row.companyId, userId: row.userId }));
    await ReportRun.destroy({ where: { id: ids } });
    return { deletedCount: ids.length, payloadFiles };
  }
};

module.exports = reportRunService;
