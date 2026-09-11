// In-memory counters for the runner process. Reset on restart.
//
// Exposed via GET /metrics so orchestrators / dashboards can scrape without
// the websocket transport. JSON shape, not Prometheus — pull through a
// node_exporter-style adapter if a TSDB needs it.

const { RUN_OUTCOMES } = require('../constants');

const startedAtMs = Date.now();

// One counter per outcome, derived rather than listed: adding an outcome to
// RUN_OUTCOMES is the whole change, here and in the per-report buckets.
function emptyCounters() {
  return Object.values(RUN_OUTCOMES).reduce(
    (counters, outcome) => ({ ...counters, [outcome]: 0 }),
    { requests: 0, inFlight: 0 }
  );
}

const totals = emptyCounters();

const perReport = Object.create(null);

function bucketFor(reportKey) {
  if (!perReport[reportKey]) {
    perReport[reportKey] = emptyCounters();
  }
  return perReport[reportKey];
}

function recordStart(reportKey) {
  totals.requests++;
  totals.inFlight++;
  const b = bucketFor(reportKey);
  b.requests++;
  b.inFlight++;
}

/**
 * Close out a run under one of RUN_OUTCOMES. One function rather than one per
 * outcome, so a new outcome is a new counter and nothing else.
 */
function record(reportKey, outcome) {
  totals[outcome]++;
  totals.inFlight = Math.max(0, totals.inFlight - 1);
  const b = bucketFor(reportKey);
  b[outcome]++;
  b.inFlight = Math.max(0, b.inFlight - 1);
}

function snapshot() {
  return {
    started_at_ms: startedAtMs,
    uptime_ms: Date.now() - startedAtMs,
    totals: { ...totals },
    per_report: Object.fromEntries(
      Object.entries(perReport).map(([k, v]) => [k, { ...v }])
    )
  };
}

module.exports = { recordStart, record, snapshot };
