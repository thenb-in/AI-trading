import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { getLocalDateStringYmd } from '@utils/dateTimeUtils';


// One run per date range, so the key that identifies a run is the range itself.
const dateRangeKey = ({ startDate, endDate }) => `${startDate}..${endDate}`;



const statusOf = (check, runState) => {
  if (!runState || runState.loading) return 'pending';
  if (runState.error) return 'failed';
  if ((runState.result?.count ?? 0) === 0) return 'cleared';
  return check.outstandingStatus;
};

const summariseResults = (checks, runStatesByCheckId) => {
  const checkCounts = { cleared: 0, outstanding: 0, pending: 0, failed: 0, critical: 0, warn: 0 };

  for (const check of checks) {
    const runState = runStatesByCheckId[check.id];
    const status = statusOf(check, runState);
    checkCounts[status]++;
    if (status === 'critical' || status === 'warn') {
      checkCounts.outstanding += runState.result.count;
    }
  }

  const totalChecks = checks.length;
  const captionParts = [`${checkCounts.cleared} of ${totalChecks} checks clear`];
  if (checkCounts.pending > 0) {
    captionParts.unshift(`${checkCounts.pending} still running`);
  }
  if (checkCounts.failed > 0) {
    captionParts.push(`${checkCounts.failed} could not be checked`);
  }

  return {
    ...checkCounts,
    total: totalChecks,
    caption: captionParts.join(' · '),
    allClear: totalChecks > 0 && checkCounts.cleared === totalChecks
  };
};

const buildReportPath = (report) => {
  if (!report?.slug) {
    return null;
  }
  const query = new URLSearchParams(
    Object.entries(report.filters ?? {}).map(([key, value]) => [key, String(value)])
  );
  const queryString = query.toString();
  return queryString ? `/admin/report/${report.slug}?${queryString}` : `/admin/report/${report.slug}`;
};

function useChecklistData(checks, runCheck) {
  const today = getLocalDateStringYmd();
  const [dateRange, setDateRange] = useState({ startDate: today, endDate: today });
  const [selectedStatus, setSelectedStatus] = useState('critical');
  const [runStatesByCheckId, setRunStatesByCheckId] = useState({});
  const [lastRunAt, setLastRunAt] = useState({});
  const rangesAlreadyRun = useRef(new Set());
  const latestRunTokens = useRef({});

  const runChecks = useCallback((rangeToRun, { force = false } = {}) => {
    const runKey = dateRangeKey(rangeToRun);
    if (!force && rangesAlreadyRun.current.has(runKey)) {
      return;
    }
    rangesAlreadyRun.current.add(runKey);

    const runToken = (latestRunTokens.current[runKey] ?? 0) + 1;
    latestRunTokens.current[runKey] = runToken;
    const isLatestRun = () => latestRunTokens.current[runKey] === runToken;

    setLastRunAt((previous) => ({ ...previous, [runKey]: new Date() }));

    const filters = { start_date: rangeToRun.startDate, end_date: rangeToRun.endDate };
    setRunStatesByCheckId((previous) => ({
      ...previous,
      ...Object.fromEntries(checks.map((check) => [check.id, { loading: true }]))
    }));

    const saveRunState = (checkId, runState) => {
      if (!isLatestRun()) {
        return;
      }
      setRunStatesByCheckId((previous) => ({ ...previous, [checkId]: runState }));
    };

    checks.forEach((check) => {
      runCheck(check.id, filters)
        .then((response) => {
          saveRunState(check.id, response?.data?.success
            ? { loading: false, result: response.data.data }
            : { loading: false, error: response?.data?.message || `Could not run ${check.title}` });
        })
        .catch((error) => {
          saveRunState(check.id, {
            loading: false,
            error: error?.message || `Could not run ${check.title}`
          });
        });
    });
  }, [checks, runCheck]);

  useEffect(() => { runChecks(dateRange); }, [dateRange, runChecks]);

  const onRefresh = useCallback(() => runChecks(dateRange, { force: true }), [runChecks, dateRange]);

  const summary = useMemo(() => summariseResults(checks, runStatesByCheckId), [checks, runStatesByCheckId]);



  const rows = useMemo(
    () => checks
      .map((check) => ({ check, runState: runStatesByCheckId[check.id] ?? { loading: true } }))
      .filter(({ check, runState }) => {
        if (selectedStatus === 'all') return true;
        const status = statusOf(check, runState);
        return status === selectedStatus || status === 'pending';
      }),
    [checks, runStatesByCheckId, selectedStatus]
  );

  return {
    dateRange,
    onDateRangeChange: setDateRange,
    selectedStatus,
    onStatusChange: setSelectedStatus,
    summary,
    rows,
    checkedAt: lastRunAt[dateRangeKey(dateRange)],
    running: summary.pending > 0,
    onRefresh
  };
}

export { useChecklistData, buildReportPath };
