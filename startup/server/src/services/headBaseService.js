const { pushActivitiesToExternalServer } = require('../../interfaces/wallet/activityInterface');
const logger = require('../../logger');
const {
  ACTIVITY_ERRORS,
  ACTIVITY_TYPE,
  HEAD_BASE_ACTION,
  HEAD_BASE_BATCH_SIZE,
  HEAD_BASE_DEFAULT_MONTHS,
  HEAD_BASE_LABEL_SUFFIX,
  HEAD_BASE_MAX_MONTHS
} = require('../constants/activity');
const walletHeadsService = require('./walletHeadsService');

// Rebuild the wallet's picture of a company's heads from the master data.
//
// The wallet counts a stock head by replaying what it was told, so it knows a
// company from the day pushes started reaching it and no earlier. Bill a period
// before that and it counts nobody. This restates the missing history: for each
// head the wallet cares about, when each object came into existence and when it
// stopped, over the last X months.
//
// Every event carries `occurredAt`, which is the whole point — a CREATE posted
// this afternoon for an object that came into existence in March has to be
// dated March or the March invoice still sees an empty company.
//
// Safe to run twice. The wallet reads each object's most recent event to decide
// what changed, so a repeated CREATE for someone already counted moves nothing,
// and its stock count is one-row-per-object regardless of how many times the
// same story was told. Running it again costs rows, not correctness.
//
// What the framework cannot know is WHERE a head's history lives: only the app
// knows which of its own tables a head sits in and which column makes one
// count. So the app registers a source per head at boot and this owns
// the replay. A head with no source is reported as unsupported rather than
// skipped in silence — a head the wallet bills on that nobody can rebuild is
// something an operator needs told, not something to find out in an invoice.
const sources = new Map();

/** Midnight on the first of the month, `months` months back. */
function windowStart(months) {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - months + 1, 1));
}

/** Months to rebuild: what was asked for, within what is sane. */
function resolveMonths(requested) {
  const months = parseInt(requested, 10);
  if (!Number.isFinite(months) || months < 1) {
    return HEAD_BASE_DEFAULT_MONTHS;
  }
  return Math.min(months, HEAD_BASE_MAX_MONTHS);
}

/**
 * One object's story as the wallet needs to hear it: a CREATE when it came into
 * existence, and a DEACTIVATE after it if it has since gone.
 *
 * The window says WHICH objects to talk about. It does not date them — the
 * object's own arrival does, however far back that is.
 *
 * That distinction is the difference between a rebuild you can run twice and
 * one you cannot. Dating the CREATE at the window's start seemed harmless (the
 * wallet only has to believe the object was there by then) but it makes the
 * event a fact about the REQUEST rather than about the object: three months
 * says "arrived 1 June", six months says "arrived 1 March", and the same object
 * lands twice because the two statements genuinely differ. Dated by its own
 * arrival, every run says the identical thing and the second one stores nothing.
 *
 * Departures before the window are dropped along with their arrivals: the
 * object was already gone when the period being rebuilt began, so it cannot
 * change any count inside it.
 */
function eventsFor(object, since) {
  const presentFrom = object.presentFrom ? new Date(object.presentFrom) : null;
  const absentFrom = object.absentFrom ? new Date(object.absentFrom) : null;

  if (absentFrom && absentFrom <= since) {
    return [];
  }
  if (!presentFrom || presentFrom > new Date()) {
    return [];
  }

  const createdAt = presentFrom;
  const events = [{ type: ACTIVITY_TYPE.CREATE, occurredAt: createdAt }];

  if (absentFrom && absentFrom >= createdAt) {
    events.push({ type: ACTIVITY_TYPE.DEACTIVATE, occurredAt: absentFrom });
  }
  return events;
}

/** One event as the wallet's push payload. */
function toPushPayload({ head, companyId, object, event, createdBy }) {
  return {
    head,
    log: JSON.stringify({ action: HEAD_BASE_ACTION, head, objectId: object.objectId }),
    timestamp: event.occurredAt.getTime(),
    // What the wallet shows in its activity list. Named as a rebuild so a row
    // dated three months ago is not mistaken for something a person did then.
    objectName: `${object.label || head} ${HEAD_BASE_LABEL_SUFFIX}`,
    objectId: String(object.objectId),
    createdBy,
    companyId,
    type: event.type,
    // The whole point of a backfill: a CREATE posted this afternoon for
    // somebody hired in March has to be dated March, or March's invoice still
    // sees an empty company.
    occurredAt: event.occurredAt.toISOString()
  };
}

/**
 * Send a head's events, a batch at a time, adding up what the wallet did with
 * them. A batch that fails outright is counted and the rest still go: half a
 * rebuilt history beats none, and the run can simply be repeated.
 */
async function pushInBatches(head, payloads) {
  const counts = { stored: 0, duplicates: 0, ignored: 0, refused: 0, failed: 0 };

  for (let start = 0; start < payloads.length; start += HEAD_BASE_BATCH_SIZE) {
    const batch = payloads.slice(start, start + HEAD_BASE_BATCH_SIZE);
    try {
      // Backdated rows land out of order with the live log, so the wallet's
      // running usage totals have to be re-derived rather than nudged. Asked
      // for on every batch: it is idempotent, and asking only on the last one
      // would leave the totals wrong whenever a run is interrupted.
      const summary = await pushActivitiesToExternalServer(batch, { rebuildUsage: true });
      for (const key of Object.keys(counts)) {
        counts[key] += summary[key] ?? 0;
      }
    } catch (error) {
      counts.failed += batch.length;
      logger.error(`Headbase batch failed for ${head} at event ${start}: ${error.message}`, error);
    }
  }
  return counts;
}

const headBaseService = {
  /**
   * Teach the framework where one head's history lives.
   *
   * @param {string} head
   * @param {{ timeline: (companyId: string, since: Date) =>
   *   Promise<Array<{ objectId, presentFrom, absentFrom, label }>> }} source
   */
  registerSource(head, source) {
    if (!head || typeof source?.timeline !== 'function') {
      throw new Error(`${ACTIVITY_ERRORS.HEAD_BASE_BAD_SOURCE}: ${head}`);
    }
    sources.set(head, source);
    logger.info(`Registered headbase source for head "${head}"`);
  },

  /**
   * Rebuild `months` of head history for one company and send it to the wallet.
   *
   * Only heads the wallet asked for are rebuilt — there is no point restating
   * the history of something it will drop on arrival — and of those, only the
   * ones this install has a source for. The rest come back in `skipped`, which
   * is reporting rather than alarm: the wallet answers for every application it
   * serves, so most of that list is somebody else's heads and this app is right
   * to have nothing to say about them. The case worth noticing is `rebuilt`
   * coming back empty.
   *
   * @param {object} params
   * @param {string} params.companyId  the company as THIS app knows it
   * @param {number} [params.months]   how far back to go
   * @param {string} [params.createdBy] operator who asked, for the audit trail
   */
  async build({ companyId, months, createdBy = null }) {
    if (!companyId) {
      throw new Error(ACTIVITY_ERRORS.HEAD_BASE_COMPANY_REQUIRED);
    }

    const resolvedMonths = resolveMonths(months);
    const since = windowStart(resolvedMonths);

    // Ask fresh: an operator building a headbase has usually just finished
    // setting the head up in the wallet, and a five-minute-old list would
    // rebuild everything except the head they came here for.
    walletHeadsService.forget();
    const trackedHeads = await walletHeadsService.trackedHeadsFor(companyId);

    if (trackedHeads === null) {
      throw new Error(ACTIVITY_ERRORS.HEAD_BASE_WALLET_UNREACHABLE);
    }

    const summary = { months: resolvedMonths, since, rebuilt: [], skipped: [] };

    for (const head of trackedHeads) {
      const source = sources.get(head);
      if (!source) {
        summary.skipped.push(head);
        continue;
      }

      const objects = await source.timeline(companyId, since);
      const payloads = objects.flatMap((object) => eventsFor(object, since)
        .map((event) => toPushPayload({ head, companyId, object, event, createdBy })));

      const result = {
        head,
        objects: objects.length,
        events: payloads.length,
        ...await pushInBatches(head, payloads)
      };

      logger.info(`Headbase ${head} for company ${companyId}: ${result.objects} object(s), ${result.events} event(s) — ${result.stored} stored, ${result.duplicates} already there, ${result.ignored} ignored, ${result.refused} refused, ${result.failed} failed`);
      summary.rebuilt.push(result);
    }

    // Nothing rebuilt at all, while the wallet named heads it tracks: every one
    // of them belongs to another application, or this app lost the source for
    // its own. Either way the operator pressed a button and got nothing, and
    // that is the only case here worth a warning.
    if (!summary.rebuilt.length) {
      logger.warn(`Headbase for company ${companyId}: nothing rebuilt — no source registered for ${summary.skipped.join(', ') || 'any tracked head'}`);
    }
    return summary;
  }
};

module.exports = headBaseService;
