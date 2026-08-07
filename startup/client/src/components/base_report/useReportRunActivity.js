import { useCallback, useEffect, useState } from 'react';

import { reportRunService } from '@services/reportRunService';
import { subscribeToReportRunDone } from '@startup/socket';
import {
  REPORT_RUN_IN_PROGRESS,
  REPORT_RUN_STATUS,
  REPORT_RUN_STARTED_EVENT,
} from '@startup/constants/reportRuns';

/**
 * The user's own report-run activity: what is still computing, and the last
 * thing that finished.
 *
 * Deliberately not polled, and there is no clock: the two moments that change
 * this are both already observable — a run starting fires
 * REPORT_RUN_STARTED_EVENT in this tab, and a run finishing arrives on the
 * socket — so nothing here has to tick.
 */
const useReportRunActivity = () => {
  const [runs, setRuns] = useState([]);

  const refresh = useCallback(async () => {
    try {
      const response = await reportRunService.list();
      setRuns(response?.data?.data?.runs ?? []);
    } catch (error) {
      // A strip that cannot load is not worth interrupting the report for.
      console.error('Failed to load report run activity', error);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const onStarted = () => refresh();
    window.addEventListener(REPORT_RUN_STARTED_EVENT, onStarted);
    return () => window.removeEventListener(REPORT_RUN_STARTED_EVENT, onStarted);
  }, [refresh]);

  useEffect(() => {
    let unsubscribe = null;
    let cancelled = false;
    subscribeToReportRunDone(() => refresh())
      .then((fn) => {
        if (cancelled) fn();
        else unsubscribe = fn;
      })
      .catch(() => {
        // Socket unavailable — the list still loaded once on mount.
      });
    return () => {
      cancelled = true;
      if (unsubscribe) unsubscribe();
    };
  }, [refresh]);

  const inProgress = runs.filter((run) => REPORT_RUN_IN_PROGRESS.includes(run.status));
  const lastCompleted = runs.find((run) => run.status === REPORT_RUN_STATUS.DONE) ?? null;

  return { inProgress, lastCompleted, refresh };
};

export { useReportRunActivity };
