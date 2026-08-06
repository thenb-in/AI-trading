import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import PropTypes from 'prop-types';
import { toast } from 'react-toastify';
import { Clock } from 'lucide-react';
import { useDataContext } from '@context/useDataContext';
import { MasterHeader } from './master_header/MasterHeader';
import { MasterTable } from './master_table/MasterTable';
import { MasterModal } from './master_modal/MasterModal';
import { MasterSearch } from './MasterSearch';
import { BaseFilter } from '../../base_filter/BaseFilter';
import { hasPermission } from '@utils/hasPermission';
import { UnauthorisedTable } from '@startup/components/common/UnauthorisedTable';
import { AuditHistoryModal } from '@startup/components/admin/audit_timeline/AuditHistoryModal';

const BaseMaster = ({
  title,
  description,
  addButtonText,
  searchPlaceholder,
  modalAddTitle,
  modalEditTitle,
  modalMaxWidth = 'md',
  baseMasterContainerWidth = 'max-w-7xl',
  auditHead,
  permissionKeys,
  loadRows,
  deleteRow,
  // Optional `(row) => boolean` for masters whose grid holds rows that are not
  // deletable records — a placeholder standing in for an empty container, say.
  // Hiding the button beats a Delete that only explains why it can't.
  canDeleteRow,
  deleteConfirmText,
  rowsKey,
  extractResponse,
  onRowClickOverride,
  unauthorizedToast = 'You are not authorized to view this table',
  unauthorizedDeleteToast = 'You are not authorized to delete this table',
  fetchSuccessToast,
  fetchFailureToast,
  showExport = false,
  showImport,
  exportFileName,
  importApi,
  buildExportColumns,
  FormComponent,
  formProps,
  formSuccessProp = 'onSuccess',
  filtersConfig,
  isFilterLoading,
  initialFilters = {},
  mapFiltersForApi,
  headerRef,
  showRefreshButton = true,
  // Where the header's Back button goes. Masters live under /admin/master, but
  // a BaseMaster mounted elsewhere (e.g. the Reporting Manager under
  // /admin/report) needs to return to its own section.
  backUrl,
  // A master mounted inside a tabbed workspace already has navigation around
  // it, so it can drop its own Back arrow.
  showBack = true,
  onDownloadTemplate,
  templateButtonText,
  onExport,
  onImport,
  extraActions,
  /** Extra buttons for the header action area (a React node). */
  extraHeaderActions,
  getRowClassName,
  /** `(row) => boolean`; flagged rows are tinted so they stand out in the grid. */
  isAlertRow,
  initialSortKey,
  initialSortDirection,
  /**
   * Field name to group rows by on first render — for masters whose rows
   * belong to a container (e.g. holidays within a holiday list). The user can
   * still toggle grouping from the column menu; this only seeds it.
   */
  defaultGroupByField = null,

  showGridExport = true,
  exportReport = { title: 'Export', slug: 'export' },
  showInsightsAsHeader = true,
  showEmptyColumns = true,
  hideConstantColumns = true,

  // Server-paged loading. `loadRows` additionally receives { page, pageSize },
  // and the response must carry a `total` (the unpaged count) alongside rows.
  infiniteScroll = false,
  pageSize = 50,

  // controler add action button
  showAdd = true,
}) => {
  const [rows, setRows] = useState([]);
  const [columns, setColumns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState(initialFilters);
  const [historyRowId, setHistoryRowId] = useState(null);
  const { userData } = useDataContext();

  const canRead = hasPermission(userData, permissionKeys.read);
  // A master with no FormComponent is read-only (e.g. an archive or a log):
  // there is nothing for Add or the edit modal to open, so neither is offered.
  const isEditable = Boolean(FormComponent);
  const canCreate = isEditable ? permissionKeys.create : null;
  const canDelete = permissionKeys.delete && hasPermission(userData, permissionKeys.delete);


  const canImport =
    hasPermission(userData, permissionKeys.create) ||
    (permissionKeys.update ? hasPermission(userData, permissionKeys.update) : false);
  const resolvedShowImport = (showImport ?? Boolean(importApi)) && canImport;

  const fetchRows = useCallback(async (filterOverride, { pageToLoad = 1, append = false } = {}) => {
    if (!canRead) {
      toast.error(unauthorizedToast);
      return;
    }
    try {
      if (append) setIsLoadingMore(true); else setLoading(true);
      const apiFilters = filterOverride ?? filters;
      const mappedFilters = mapFiltersForApi ? mapFiltersForApi(apiFilters) : apiFilters;
      const requestFilters = infiniteScroll
        ? { ...mappedFilters, page: pageToLoad, pageSize }
        : mappedFilters;
      const response = await loadRows(requestFilters);
      if (response.data.success || extractResponse) {
        const extracted = extractResponse
          ? extractResponse(response)
          : {
            rows: response.data.data[rowsKey] || [],
            columns: response.data.data.columns || [],
            total: response.data.data.total,
          };
        const nextRows = extracted.rows;
        setRows((prev) => (append ? [...prev, ...nextRows] : nextRows));
        setColumns(extracted.columns);
        setTotal((prev) => extracted.total ?? (append ? prev : nextRows.length));
        setPage(pageToLoad);
        if (fetchSuccessToast) toast.success(fetchSuccessToast);
      }
    } catch (error) {
      console.error(`${title}: Error fetching rows`, { error });
      if (fetchFailureToast) toast.error(fetchFailureToast);
    } finally {
      if (append) setIsLoadingMore(false); else setLoading(false);
    }
  }, [canRead, loadRows, rowsKey, fetchSuccessToast, fetchFailureToast, unauthorizedToast, title, filters, mapFiltersForApi, extractResponse, infiniteScroll, pageSize]);

  const loadMoreRef = useRef({});
  loadMoreRef.current = { loading, isLoadingMore, rowCount: rows.length, total, page, fetchRows };
  const isFetchingMoreRef = useRef(false);

  const handleLoadMore = useCallback(() => {
    const state = loadMoreRef.current;
    if (isFetchingMoreRef.current) return;
    if (state.loading || state.isLoadingMore || state.rowCount >= state.total) return;
    isFetchingMoreRef.current = true;
    Promise.resolve(state.fetchRows(undefined, { pageToLoad: state.page + 1, append: true }))
      .finally(() => { isFetchingMoreRef.current = false; });
  }, []);

  useEffect(() => {
    fetchRows();
  }, []);

  const filteredData = useMemo(() => {
    if (!searchQuery) return rows;
    const keys = (columns || []).map((c) => c.id);
    const q = searchQuery.toLowerCase();
    // JSON-shaped cells (e.g. a stored filter set) stringify to "[object Object]"
    // and would never match, so serialise them instead of coercing.
    const searchable = (value) => (
      value !== null && typeof value === 'object' ? JSON.stringify(value) : String(value ?? '')
    );
    return rows.filter((row) => keys.some((k) => searchable(row?.[k]).toLowerCase().includes(q)));
  }, [rows, columns, searchQuery]);

  const exportColumns = useMemo(
    () => (buildExportColumns ? buildExportColumns(columns) : columns?.map((col) => ({ field: col.id, headerName: col.label, type: col.type }))),
    [columns, buildExportColumns],
  );

  const handleDelete = async (id) => {
    if (!canDelete) {
      toast.error(unauthorizedDeleteToast);
      return;
    }
    if (!window.confirm(deleteConfirmText)) return;
    try {
      const response = await deleteRow(id);
      if (response.data.success) {
        setRows((prev) => prev.filter((r) => r.id !== id));
      } else {
        toast.error(response.data.message || response.message);
      }
    } catch (error) {
      console.error(`${title}: Error deleting row`, { error });
    }
  };

  const actions = [
    ...(extraActions ? extraActions({ refresh: fetchRows, setRows, openEdit: (row) => handleRowClick(row) }) : []),
    // Who changed this row, and when. The same timeline the edit modal shows,
    // but reachable straight from the grid — rows that can't be opened for
    // edit (locked, approved, read-only masters) still have a history.
    ...(auditHead
      ? [
          {
            label: 'History',
            icon: <Clock className="h-3 w-3" />,
            onClick: (id) => setHistoryRowId(id),
          },
        ]
      : []),
    ...(canDelete
      ? [
          {
            label: 'Delete',
            onClick: (id) => handleDelete(id),
            type: 'danger',
            show: canDeleteRow,
          },
        ]
      : []),
  ];

  const handleAdd = () => {
    setSelectedRow(null);
    setIsModalOpen(true);
  };

  const handleRowClick = (row) => {
    if (onRowClickOverride) {
      onRowClickOverride(row);
      return;
    }
    if (!isEditable) {
      return;
    }
    setSelectedRow(row);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedRow(null);
  };

  const handleCloseHistory = () => setHistoryRowId(null);

  // Adapters that inject the current rows/columns/refresh into caller-supplied
  // callbacks. Defined here (rather than inline in JSX) to satisfy the
  // "no inline arrow in JSX" lint and avoid re-rendering with new identity
  // when those captured values are unchanged.
  const boundImportApi = importApi
    ? (formData) => importApi(formData, { rows, columns, refresh: fetchRows })
    : undefined;
  const boundOnDownloadTemplate = onDownloadTemplate
    ? () => onDownloadTemplate({ columns: exportColumns, rows })
    : undefined;
  const boundOnExport = onExport ? () => onExport({ columns, rows }) : undefined;
  const boundOnImport = onImport
    ? () => onImport({ columns, rows, refresh: fetchRows })
    : undefined;
  const handleFiltersApply = (applied) => {
    setFilters(applied);
    fetchRows(applied);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className={`${baseMasterContainerWidth} mx-auto`}>
        <MasterHeader
          ref={headerRef}
          title={title}
          description={description}
          onAdd={isEditable && showAdd ? handleAdd : undefined}
          userData={userData}
          permissionKey={canCreate}
          addButtonText={addButtonText}
          backUrl={backUrl}
          showBack={showBack}
          onRefresh={() => fetchRows()}
          showRefresh={showRefreshButton}
          showExport={showExport}
          showImport={resolvedShowImport}
          exportColumns={showExport ? exportColumns : undefined}
          exportRows={showExport ? rows : undefined}
          exportFileName={exportFileName}
          importApi={boundImportApi}
          onDownloadTemplate={boundOnDownloadTemplate}
          templateButtonText={templateButtonText}
          onExport={boundOnExport}
          onImport={boundOnImport}
          extraHeaderActions={extraHeaderActions}
        />
        {filtersConfig && (
          <BaseFilter
            onFiltersApply={handleFiltersApply}
            filtersConfig={filtersConfig}
            isLoading={isFilterLoading}
            disabled={loading}
          />
        )}
        <div className="mb-4 flex w-full md:justify-center">
          <MasterSearch
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder={searchPlaceholder}
          />
        </div>
        {canRead ? (
          <MasterTable
            columns={columns}
            data={filteredData}
            loading={loading}
            actions={actions}
            onRowClick={handleRowClick}
            rowClickEnabled={isEditable || Boolean(onRowClickOverride)}
            infiniteScroll={infiniteScroll}
            hasMore={infiniteScroll && rows.length < total}
            onLoadMore={handleLoadMore}
            isLoadingMore={isLoadingMore}
            getRowClassName={getRowClassName}
            isAlertRow={isAlertRow}
            initialSortKey={initialSortKey}
            initialSortDirection={initialSortDirection}
            defaultGroupByField={defaultGroupByField}
            
            
            showGridExport={showGridExport}
            exportReport={exportReport}
            showInsightsAsHeader={showInsightsAsHeader}
            showEmptyColumns={showEmptyColumns}
            hideConstantColumns={hideConstantColumns}
          />
        ) : (
          <UnauthorisedTable />
        )}
        {isEditable && (
          <MasterModal
            isOpen={isModalOpen}
            onClose={handleCloseModal}
            title={selectedRow ? modalEditTitle : modalAddTitle}
            maxWidth={modalMaxWidth}
            auditHead={auditHead}
            auditObjectId={selectedRow?.id}
            showAudit={Boolean(selectedRow?.id)}
          >
            <FormComponent
              isOpen
              onClose={handleCloseModal}
              initialData={selectedRow}
              {...{ [formSuccessProp]: fetchRows }}
              {...(formProps ? formProps(selectedRow) : {})}
            />
          </MasterModal>
        )}
        {auditHead && historyRowId !== null && (
          <AuditHistoryModal
            isOpen
            onClose={handleCloseHistory}
            head={auditHead}
            objectId={historyRowId}
          />
        )}
      </div>
    </div>
  );
};

BaseMaster.propTypes = {
  title: PropTypes.string.isRequired,
  description: PropTypes.string,
  // Add-button and modal props apply only when a FormComponent is supplied.
  // A read-only master (no form) renders neither, so none of them are required.
  addButtonText: PropTypes.string,
  searchPlaceholder: PropTypes.string,
  modalAddTitle: PropTypes.string,
  modalEditTitle: PropTypes.string,
  modalMaxWidth: PropTypes.string,
  baseMasterContainerWidth: PropTypes.string,
  auditHead: PropTypes.string,
  permissionKeys: PropTypes.shape({
    read: PropTypes.string.isRequired,
    create: PropTypes.string,
    update: PropTypes.string,
    delete: PropTypes.string,
  }).isRequired,
  loadRows: PropTypes.func.isRequired,
  deleteRow: PropTypes.func,
  canDeleteRow: PropTypes.func,
  deleteConfirmText: PropTypes.string,
  rowsKey: PropTypes.string,
  extractResponse: PropTypes.func,
  onRowClickOverride: PropTypes.func,
  unauthorizedToast: PropTypes.string,
  unauthorizedDeleteToast: PropTypes.string,
  fetchSuccessToast: PropTypes.string,
  fetchFailureToast: PropTypes.string,
  showExport: PropTypes.bool,
  showImport: PropTypes.bool,
  exportFileName: PropTypes.string,
  showGridExport: PropTypes.bool,
  exportReport: PropTypes.shape({ title: PropTypes.string, slug: PropTypes.string }),
  showInsightsAsHeader: PropTypes.bool,
  showEmptyColumns: PropTypes.bool,
  hideConstantColumns: PropTypes.bool,
  importApi: PropTypes.func,
  buildExportColumns: PropTypes.func,
  // Omit for a read-only master — no Add button, no edit modal.
  FormComponent: PropTypes.elementType,
  formProps: PropTypes.func,
  formSuccessProp: PropTypes.string,
  filtersConfig: PropTypes.array,
  isFilterLoading: PropTypes.bool,
  initialFilters: PropTypes.object,
  mapFiltersForApi: PropTypes.func,
  headerRef: PropTypes.object,
  showRefreshButton: PropTypes.bool,
  backUrl: PropTypes.string,
  showBack: PropTypes.bool,
  onDownloadTemplate: PropTypes.func,
  templateButtonText: PropTypes.string,
  onExport: PropTypes.func,
  onImport: PropTypes.func,
  extraActions: PropTypes.func,
  getRowClassName: PropTypes.func,
  isAlertRow: PropTypes.func,
  initialSortKey: PropTypes.string,
  extraHeaderActions: PropTypes.node,
  defaultGroupByField: PropTypes.string,
  initialSortDirection: PropTypes.string,
  infiniteScroll: PropTypes.bool,
  pageSize: PropTypes.number,
  showAdd: PropTypes.bool,
};

export { BaseMaster };
