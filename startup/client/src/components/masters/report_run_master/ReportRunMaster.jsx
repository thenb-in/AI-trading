import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, RefreshCw, Square } from 'lucide-react';
import { toast } from 'react-toastify';

import { BaseMaster } from '@startup/components/base_components/master';
import { MASTERS } from '@startup/constants/masters';
import { reportRunService } from '@services/reportRunService';
import { enqueueSavedReportRun } from '@startup/socket';
import {
  REPORT_RUN_IN_PROGRESS,
  REPORT_RUN_STATUS,
  REPORTS_ROOT_PATH,
  savedRunPath,
} from '@startup/constants/reportRuns';
import { REPORT_RUN_COLUMNS } from './reportRunColumns';

// Viewing a saved run is viewing a report, so it takes the same permission as
// running one. Runs are already scoped to the requesting user on the server, so
// "delete" can only ever reach your own.
const PERMISSION_KEYS = {
  read: 'view_report_module',
  delete: 'view_report_module',
};

const loadRuns = () => reportRunService.list();
const deleteRun = (id) => reportRunService.remove(id);

// BaseMaster hands columns straight to the grid, so they are defined here rather
// than returned by the API — the status chip and filter chips are JSX.
const extractResponse = (response) => ({
  rows: response?.data?.data?.runs ?? [],
  columns: REPORT_RUN_COLUMNS,
});

const ReportRunMaster = () => {
  const navigate = useNavigate();

  // Open the report itself on this run. The payload load lives on the report
  // page (keyed off ?runId=), so the destination is just a URL — which means it
  // survives a refresh, can be shared, and is the very same link the "report
  // ready" notification uses.
  const openRun = useCallback((row) => {
    if (row.status !== REPORT_RUN_STATUS.DONE) {
      toast.info(`This run is ${row.status}. Nothing to open yet.`);
      return;
    }
    navigate(savedRunPath(row.reportKey, row.id));
  }, [navigate]);

  const rerun = useCallback(async (row, refresh) => {
    try {
      await enqueueSavedReportRun({
        reportKey: row.reportKey,
        reportTitle: row.reportTitle,
        filters: row.filters,
      });
      toast.success('Re-run started. You will be notified when it is ready.');
      refresh();
    } catch (error) {
      console.error('Failed to re-run report', error);
      toast.error(error?.message || 'Failed to start the re-run.');
    }
  }, []);

  // Stopping frees the report server for everyone else's work, so it is worth
  // offering on a queued run as much as on one already computing.
  const stop = useCallback(async (row, refresh) => {
    try {
      await reportRunService.cancel(row.id);
      toast.success(`${row.reportTitle || 'Report'} stopped.`);
      refresh();
    } catch (error) {
      console.error('Failed to stop report run', error);
      toast.error(error?.response?.data?.message || error?.message || 'Failed to stop this run.');
      refresh();
    }
  }, []);

  const extraActions = useCallback(
    ({ refresh }) => [
      {
        label: 'Open',
        icon: <Eye className="w-3 h-3" />,
        type: 'primary',
        show: (row) => row.status === REPORT_RUN_STATUS.DONE,
        onClick: (_id, row) => openRun(row),
      },
      {
        label: 'Stop',
        icon: <Square className="w-3 h-3" />,
        type: 'danger',
        show: (row) => REPORT_RUN_IN_PROGRESS.includes(row.status),
        onClick: (_id, row) => stop(row, refresh),
      },
      {
        label: 'Re-run',
        icon: <RefreshCw className="w-3 h-3" />,
        type: 'success',
        onClick: (_id, row) => rerun(row, refresh),
      },
    ],
    [openRun, rerun, stop],
  );

  return (
    <BaseMaster
      masterName={MASTERS.REPORT_RUN}
      title="Reporting Manager"
      description="Reports you have run, kept with the filters that produced them. Open one to load it instantly instead of computing it again."
      searchPlaceholder="Search by report name or filter..."
      permissionKeys={PERMISSION_KEYS}
      backUrl={REPORTS_ROOT_PATH}
      loadRows={loadRuns}
      deleteRow={deleteRun}
      deleteConfirmText="Delete this saved report run? The stored result will be removed."
      extractResponse={extractResponse}
      onRowClickOverride={openRun}
      extraActions={extraActions}
      unauthorizedToast="You are not authorized to view report runs"
      fetchFailureToast="Failed to load report runs"
      initialSortKey="createdAt"
      initialSortDirection="desc"
      // Ten runs of the same report share a report name; folding that column
      // into Insights would drop the one thing identifying each row.
      hideConstantColumns={false}
      exportReport={{ title: 'Report Runs', slug: 'report-runs' }}
    />
  );
};

export { ReportRunMaster };
