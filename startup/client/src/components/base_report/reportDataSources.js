// Where a report's rows come from, and how they land on the grid.
//
// Three sources, one destination:
//   - HTTP        — computed now on the app server (blue Apply)
//   - report_runner — computed in the background and kept (green Apply)
//   - a saved run — read back off disk, nothing recomputed (?runId=)
//
// They all funnel through applyReportPayload, so they cannot drift apart in how
// they handle custom setters or caller-owned mapping. Split out of ReportUtils
// to keep both files inside the repo's file-length rule.

import { toast } from "react-toastify";

import { getReportApi } from "@startup/data/reportApiRegistry";
import { sanitizeFilterValues, writeFilterValuesToParams } from "@startup/components/base_filter/filter/helpers";
import { reportRunService } from "@services/reportRunService";
import { runSavedReportToCompletion, awaitReportRunById } from "@startup/socket";
import { SAVED_RUN_PARAM, REPORT_RUN_IN_PROGRESS } from "@startup/constants/reportRuns";
import { processApiData } from "./ReportUtils";

/**
 * Map a fetched report payload onto the grid.
 *
 * `applyData` lets a caller own the mapping when the response isn't the standard
 * single { data, columns } shape (e.g. multi-section reports).
 */
const applyReportPayload = ({
  apiData,
  setRows,
  setColumns,
  setStatusDefinitions,
  hasStatusDefinitions = false,
  setOriginalColumns = null,
  applyData = null,
}) => {
  if (applyData) {
    applyData(apiData);
    return;
  }
  if (setOriginalColumns && apiData?.columns) setOriginalColumns(apiData.columns);

  const { gridColumns, gridRows } = processApiData(apiData, setStatusDefinitions, hasStatusDefinitions);

  // Batch column and row updates together to prevent partial renders.
  // setColumns can be an arity-2 (cols, rows) combined setter from the caller.
  if (typeof setColumns === 'function' && setColumns.length === 2) {
    setColumns(gridColumns, gridRows);
  } else {
    setColumns(gridColumns);
    setRows(gridRows);
  }
};

// Render a run, reached via ?runId= on the report route — from the Reporting
// Manager, the "report ready" notification, or the activity strip.
//
// Nothing is recomputed: a finished run's stored payload is read back off disk.
// A run that is still computing is adopted rather than refused — its filters go
// on screen immediately and the rows fill in when it lands, so clicking a
// running report puts you on it as if you had started it in this tab.
//
// The run's filters are pushed into the URL either way, so the filter bar shows
// what produced (or will produce) these rows, with runId kept so a refresh lands
// on the same result rather than silently re-running the report.
const loadSavedReportRun = async ({
  runId,
  setRows,
  setColumns,
  setLoading,
  setInitialLoad,
  setStatusDefinitions,
  hasStatusDefinitions = false,
  setOriginalColumns = null,
  applyData = null,
  setSearchParams,
}) => {
  let pending = null;
  try {
    setLoading(true);

    // Subscribed before the status is read: a run that finishes in between would
    // otherwise be waited on forever.
    pending = await awaitReportRunById(runId);

    const run = await reportRunService.get(runId);

    // Filters first — they describe the run whether or not its rows exist yet.
    if (run?.filters && setSearchParams) {
      writeFilterValuesToParams({ ...run.filters, [SAVED_RUN_PARAM]: runId }, setSearchParams);
    }

    if (run && REPORT_RUN_IN_PROGRESS.includes(run.status)) {
      toast.info(`${run.reportTitle || 'Report'} is still running — it will appear here when it finishes.`);
      await pending.finished;
    }

    const apiData = await reportRunService.getPayload(runId);

    applyReportPayload({
      apiData,
      setRows,
      setColumns,
      setStatusDefinitions,
      hasStatusDefinitions,
      setOriginalColumns,
      applyData,
    });
  } catch (error) {
    // A run stopped while this page waited for it is not an error to alarm
    // anyone with — it is the outcome someone asked for.
    if (error?.runCancelled) {
      toast.info(error.message);
      return;
    }
    console.error('Error loading saved report run:', error);
    toast.error(
      error?.response?.data?.message
      || error?.message
      || 'Could not open this saved report. It may have been cleaned up — run it again.'
    );
  } finally {
    pending?.cancel();
    setLoading(false);
    if (setInitialLoad) setInitialLoad(false);
  }
};

// Socket path — the runner computes the report, keeps it, and announces it.
//
// Nothing here waits on a socket ack for the whole run: the ack lands as soon as
// the run is recorded, and this resolves when the completion event arrives. If
// the user navigates away first, the component unmounts and this promise is
// simply abandoned — the run still finishes, still gets saved, and the user is
// told through the notification bell.
//
// Returns the normalised { apiData, successMessage } shape the shared
// post-processing in handleFiltersApply consumes.
const runReportViaReportRunner = async (report, sanitizedFilters) => {
  const { runId } = await runSavedReportToCompletion({
    reportKey: report.slug,
    reportTitle: report.title,
    filters: sanitizedFilters,
  });
  const apiData = await reportRunService.getPayload(runId);
  return {
    apiData,
    successMessage: 'Report ready',
  };
};

// HTTP path — runs the report on the app server directly via the app-registered
// report API. Read through the registry rather than importing @app here: startup
// is the framework and must not depend on the app it hosts.
// Same return shape as runReportViaReportRunner so handleFiltersApply stays
// oblivious to transport.
const runReportOnMainServer = async (report, sanitizedFilters) => {
  const response = await getReportApi().getReportData(report.slug, sanitizedFilters);
  return {
    apiData: response.data.data,
    successMessage: response.data.message || 'Filters applied successfully!',
  };
};

// Apply filters and load report data into the grid.
//
// `transport` picks which path runs the query:
//   'runner' → runReportViaReportRunner  (socket → dedicated runner process)
//   'http'   → runReportOnMainServer     (REST → app server, default)
//
// `applyData` lets a caller own how the fetched payload maps onto the grid —
// pass it when the response isn't the standard single `{ data, columns }`
// shape (e.g. multi-section reports). When omitted, the default
// processApiData → setColumns/setRows path runs. Everything else (sanitize,
// URL sync, transport, loading flags, toasts) stays shared.
const handleFiltersApply = async ({
  filters,
  report,
  setRows,
  setColumns,
  setLoading,
  setIsFiltering,
  setSearchParams,
  setStatusDefinitions,
  hasStatusDefinitions = false,
  setOriginalColumns = null,
  transport = 'http',
  applyData = null,
}) => {
  try {
    setIsFiltering(true);
    setLoading(true);

    const sanitizedFilters = sanitizeFilterValues(filters);

    writeFilterValuesToParams(filters, setSearchParams);

    const { apiData, successMessage } = transport === 'runner'
      ? await runReportViaReportRunner(report, sanitizedFilters)
      : await runReportOnMainServer(report, sanitizedFilters);

    applyReportPayload({
      apiData,
      setRows,
      setColumns,
      setStatusDefinitions,
      hasStatusDefinitions,
      setOriginalColumns,
      applyData,
    });

    toast.success(successMessage);
  } catch (error) {
    // Stopped on purpose — say so plainly and leave the grid as it was.
    if (error?.runCancelled) {
      toast.info(error.message);
      return;
    }
    console.error('Error applying filters:', error);
    toast.error(error?.response?.data?.message || error?.message || 'Failed to fetch report data. Please try again.');
  } finally {
    setLoading(false);
    setIsFiltering(false);
  }
};

export { applyReportPayload, loadSavedReportRun, handleFiltersApply };
