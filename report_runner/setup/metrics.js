// In-memory counters for the runner process. Reset on restart.
//
// Exposed via GET /metrics so orchestrators / dashboards can scrape without
// the websocket transport. JSON shape, not Prometheus — pull through a
// node_exporter-style adapter if a TSDB needs it.

const startedAtMs = Date.now();

const totals = {
  requests: 0,
  successes: 0,
  errors: 0,
  inFlight: 0,
};

const perReport = Object.create(null);

function bucketFor(reportKey) {
  if (!perReport[reportKey]) {
    perReport[reportKey] = { requests: 0, successes: 0, errors: 0, inFlight: 0 };
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

function recordSuccess(reportKey) {
  totals.successes++;
  totals.inFlight = Math.max(0, totals.inFlight - 1);
  const b = bucketFor(reportKey);
  b.successes++;
  b.inFlight = Math.max(0, b.inFlight - 1);
}

function recordError(reportKey) {
  totals.errors++;
  totals.inFlight = Math.max(0, totals.inFlight - 1);
  const b = bucketFor(reportKey);
  b.errors++;
  b.inFlight = Math.max(0, b.inFlight - 1);
}

function snapshot() {
  return {
    started_at_ms: startedAtMs,
    uptime_ms: Date.now() - startedAtMs,
    totals: { ...totals },
    per_report: Object.fromEntries(
      Object.entries(perReport).map(([k, v]) => [k, { ...v }])
    ),
  };
}

module.exports = { recordStart, recordSuccess, recordError, snapshot };
