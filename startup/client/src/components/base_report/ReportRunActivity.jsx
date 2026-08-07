import { useCallback } from 'react';
import PropTypes from 'prop-types';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Loader2, CheckCircle2, ArrowUpRight, X } from 'lucide-react';

import { formatRelativeTime } from '@utils/dateTimeUtils';
import { reportRunService } from '@services/reportRunService';
import { REPORTING_MANAGER_PATH, savedRunPath } from '@startup/constants/reportRuns';
import { useReportRunActivity } from './useReportRunActivity';

/**
 * A report currently computing. No elapsed counter: a ticking number invites you
 * to watch it, and how long it has been is not something you can act on. What
 * you can act on is going to the run — or, having realised you filtered it
 * wrong, stopping it. Both are here because this strip is the one place a
 * running report is visible from wherever you happen to be.
 */
const RunningChip = ({ run, onOpen, onStop }) => {
  const handleClick = useCallback(() => onOpen(run), [onOpen, run]);
  const handleStop = useCallback(() => onStop(run), [onStop, run]);
  return (
    <span className="inline-flex items-center rounded-full bg-blue-50 font-semibold text-blue-700">
      <button
        type="button"
        onClick={handleClick}
        title={`Go to this run — started ${formatRelativeTime(run.createdAt)}`}
        className="inline-flex items-center gap-1.5 rounded-l-full py-1 pl-2.5 pr-1.5 transition-colors hover:bg-blue-100"
      >
        <Loader2 size={12} className="animate-spin" />
        {run.reportTitle || run.reportKey}
      </button>
      <button
        type="button"
        onClick={handleStop}
        title="Stop this run"
        aria-label={`Stop ${run.reportTitle || run.reportKey}`}
        className="rounded-r-full py-1 pl-1 pr-2 text-blue-400 transition-colors hover:bg-red-100 hover:text-red-600"
      >
        <X size={12} />
      </button>
    </span>
  );
};

RunningChip.propTypes = {
  run: PropTypes.object.isRequired,
  onOpen: PropTypes.func.isRequired,
  onStop: PropTypes.func.isRequired,
};

/**
 * Your own report activity, parked next to the filters: what is still running,
 * and the last thing that finished.
 *
 * It spans every report, not just the one on screen — the point is that a run
 * you started ten minutes ago on another report is still yours to wait for, and
 * you should not have to remember it or go hunting in the Reporting Manager.
 * Each row names its report for that reason.
 */
const ReportRunActivity = () => {
  const navigate = useNavigate();
  const { inProgress, lastCompleted, refresh } = useReportRunActivity();

  // Clicking a running report takes you to it. The report page adopts the run:
  // its filters go on screen straight away and its rows arrive when it finishes,
  // exactly as if the run had been started in this tab.
  const openRun = useCallback(
    (run) => navigate(savedRunPath(run.reportKey, run.id)),
    [navigate],
  );

  // The strip refreshes itself when the stop lands on the socket; refreshing
  // here too is what makes the chip go away on the click rather than a moment
  // later, and covers the case where the socket is down.
  const stopRun = useCallback(
    async (run) => {
      try {
        await reportRunService.cancel(run.id);
        toast.success(`${run.reportTitle || 'Report'} stopped.`);
      } catch (error) {
        console.error('Failed to stop report run', error);
        toast.error(error?.response?.data?.message || error?.message || 'Failed to stop this run.');
      }
      refresh();
    },
    [refresh],
  );

  const openLastCompleted = useCallback(() => {
    if (!lastCompleted) return;
    navigate(savedRunPath(lastCompleted.reportKey, lastCompleted.id));
  }, [navigate, lastCompleted]);

  const openManager = useCallback(() => navigate(REPORTING_MANAGER_PATH), [navigate]);

  // Nothing running and nothing run yet — say nothing rather than show an empty box.
  if (inProgress.length === 0 && !lastCompleted) {
    return null;
  }

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs shadow-sm">
      {inProgress.length > 0 && (
        <>
          <span className="font-bold uppercase tracking-wide text-gray-500">Running</span>
          {inProgress.map((run) => (
            <RunningChip key={run.id} run={run} onOpen={openRun} onStop={stopRun} />
          ))}
        </>
      )}

      {lastCompleted && (
        <>
          {inProgress.length > 0 && <span className="mx-1 h-4 w-px bg-gray-200" />}
          <span className="font-bold uppercase tracking-wide text-gray-500">Last ready</span>
          <button
            type="button"
            onClick={openLastCompleted}
            className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 font-semibold text-emerald-700 transition-colors hover:bg-emerald-100"
            title="Open this saved result"
          >
            <CheckCircle2 size={12} />
            {lastCompleted.reportTitle || lastCompleted.reportKey}
            <span className="font-normal text-emerald-600">
              {Number(lastCompleted.rowCount ?? 0).toLocaleString('en-IN')} rows
              {' · '}
              {formatRelativeTime(lastCompleted.createdAt)}
            </span>
            <ArrowUpRight size={12} />
          </button>
        </>
      )}

      <button
        type="button"
        onClick={openManager}
        className="ml-auto font-semibold text-gray-500 underline-offset-2 hover:text-gray-800 hover:underline"
      >
        All runs
      </button>
    </div>
  );
};

export { ReportRunActivity };
