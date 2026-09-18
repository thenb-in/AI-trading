import { useState, useEffect, useMemo } from 'react';
import PropTypes from 'prop-types';
import { toast } from 'react-toastify';
import { Clock } from 'lucide-react';
import { useDataContext } from '@context/useDataContext';
import { MasterHeader } from './master_header/MasterHeader';
import { MasterTable } from './master_table/MasterTable';
import { BaseModal, recordTitle } from './master_modal/BaseModal';
import { FormModal } from './master_modal/FormModal';
import { MasterSearch } from './MasterSearch';
import { MasterRecordDetails } from './MasterRecordDetails';
import { useRecordNav } from './useRecordNav';
import { useMasterRows } from './useMasterRows';
import { useMasterModal } from './useMasterModal';
import { useRowSearch } from '@startup/hooks/useRowSearch';
import { BaseFilter } from '../../base_filter/BaseFilter';
import { hasPermission } from '@startup/hooks/hasPermission';
import { UnauthorisedTable } from '@startup/components/common/UnauthorisedTable';
import { AuditHistoryModal } from '@startup/components/admin/audit_timeline/AuditHistoryModal';
import { DEFAULT_WORKFLOW, amendCopy, statusOf } from '../workflow/workflow';
import { useWorkflowRowActions } from '../workflow/useWorkflowRowActions';
import { BulkActionBar } from './bulk_actions/BulkActionBar';
import { useMasterApproval } from './bulk_actions/useMasterApproval';

const BaseMaster = ({
  title,
  description,
  addButtonText,
  searchPlaceholder,
  // Row fields the search also matches that the grid does not show (an address, the id).
  searchKeys,
  modalAddTitle,
  modalEditTitle,
  modalMaxWidth = 'md',
  baseMasterContainerWidth = 'max-w-7xl',
  // The name the server files this master's activity under ("NotificationRule"),
  // where its routes log any. Not the master's name: heads are a key the wallet
  // prices and caps by, so they are spelled the server's way, and a master
  // without activity logging simply has none. Comments and attachments key off
  // `masterName` instead, so they need nothing here.
  auditHead,
  permissionKeys,
  // What a record goes through (see workflow.js); a master that declares none
  // has DEFAULT_WORKFLOW's single `saved` status. `masterName` names permissions
  // permissionKeys does not (approve_<masterName>). `workflowHooks` override an
  // action's default — { approve: ({ record, formData, to }) => ... } — in the
  // form's footer, and are what a row button runs, since a list has no form.
  // Amend opens the copy in the form unless hooked. `rowWorkflowHooks` are run
  // by row buttons only, for a master whose form keeps the default (validate and
  // save its edits with the new status) but whose list still needs the move.
  workflow = DEFAULT_WORKFLOW,
  masterName,
  workflowHooks = {},
  rowWorkflowHooks = {},
  // { [action key]: (record) => boolean } — narrows an action to the records it
  // suits, on the rows and in the form's footer (never on a deleted record, say).
  workflowShowWhen = {},
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
  // What a row click opens. Omit it and a row opens FormComponent to edit, or,
  // on a master with no form, every column of the row read-only.
  DetailComponent,
  // `(record, { rows }) => props` for the form or details — the loaded rows too,
  // for a form that checks against its siblings (the next free code, say).
  formProps,
  formSuccessProp = 'onSuccess',
  createLabel, updateLabel, savingLabel, // Save button wording; FormModal defaults to Create / Update / Saving...
  // Any other FormModal props the form's modal needs (attachBeforeSave).
  modalProps,
  filtersConfig,
  // While the master is still loading what the filters offer (a report's options), the filter bar stays disabled.
  isFilterLoading,
  initialFilters = {},
  mapFiltersForApi,
  // Optional `(rows) => rows` run over what the grid shows, after search — for
  // decoration that depends on the whole set, like tinting rows that share a record.
  mapRows,
  // Optional `(refresh) => unsubscribe`, for rows that change outside this page
  // (a cache bust elsewhere). They reload in place, keeping the grid's sort and filters.
  subscribeToRefresh,
  // Shown between the header and the grid — a node, or a function given
  // { rows, columns, refresh, openRecord, summary } (openRecord(record) opens the
  // modal on it — a new record seeded from a link, say; summary is what
  // extractResponse read about the whole set, e.g. a total over every page).
  headerContent,
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
  // Approve / reject a row and a selection of rows, from one declaration — for masters
  // that decide on records by a status code rather than running a workflow.
  approval,
  // `({ refresh, rows, setRows, openEdit, openRecord }) => row actions`; openRecord opens the
  // modal on any record — a new one a row seeds (a return against it), not only the row.
  extraActions,
  /** Extra buttons for the header action area (a React node). */
  extraHeaderActions,
  getRowClassName,
  // Grid row height ('compact' | 'standard' | 'comfortable') and the name its
  // saved layouts and exports are filed under — passed through to MasterTable.
  density,
  documentName,
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

  // Server-paged loading. `loadRows` additionally receives { page, pageSize };
  // there is more while the page is under the response's pagination.totalPages
  // (or extractResponse's hasMore), otherwise until a page comes back empty.
  infiniteScroll = false,
  pageSize = 50,
  // The server matches the search box (sent to loadRows as `search`), for rows
  // too many to load at once; otherwise the loaded rows are matched here.
  serverSearch = false,
  // A filter bar of the master's own, in place of filtersConfig:
  // ({ filters, applyFilters }) => node. Applied filters are kept for paging and refresh.
  renderFilters,
  // `(id) => record`: a saved record opens in its form loaded whole, not as its list row.
  loadRecord,
  // A URL parameter (`id`) that opens that record on arrival — a link from elsewhere.
  openParam,
  // Called when the modal closes, e.g. to go back where a link came from.
  onModalClose,

  // controler add action button
  showAdd = true,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [historyRowId, setHistoryRowId] = useState(null);
  const { userData } = useDataContext();
  const modal = useMasterModal({ openParam, onClose: onModalClose });
  const { selectedRow, setSelectedRow } = modal;
  const { handleVisibleRowsChange, recordNav } = useRecordNav(selectedRow, setSelectedRow);

  // A master with no read permission (e.g. one over the browser's own cache) is open to all.
  const canRead = !permissionKeys.read || hasPermission(permissionKeys.read, userData);
  // Add needs something to open and the permission to create with. A master
  // that declares no create permission offers no Add — a missing declaration is
  // not a reason to let everyone add.
  const canAdd = Boolean(FormComponent)
    && Boolean(permissionKeys.create)
    && hasPermission(permissionKeys.create, userData);
  const canDelete = permissionKeys.delete && hasPermission(permissionKeys.delete, userData);

  const canImport =
    hasPermission(permissionKeys.create, userData) ||
    (permissionKeys.update ? hasPermission(permissionKeys.update, userData) : false);
  const resolvedShowImport = (showImport ?? Boolean(importApi)) && canImport;

  const {
    rows, setRows, columns, summary, loading, isLoadingMore, hasMore, filters,
    fetchRows, loadMore, applyFilters, reloadQuietly, patchRow,
  } = useMasterRows({
    title, canRead, loadRows, rowsKey, extractResponse, initialFilters, mapFiltersForApi,
    infiniteScroll, pageSize, serverSearch, searchQuery, unauthorizedToast, fetchSuccessToast, fetchFailureToast,
  });

  useEffect(() => subscribeToRefresh?.(reloadQuietly), [subscribeToRefresh, reloadQuietly]);

  const matchedRows = useRowSearch(rows, serverSearch ? '' : searchQuery, { columns, searchKeys });
  const filteredData = useMemo(() => (mapRows ? mapRows(matchedRows) : matchedRows), [matchedRows, mapRows]);

  const exportColumns = useMemo(
    () => (buildExportColumns ? buildExportColumns(columns) : columns?.map((col) => ({ field: col.id, headerName: col.label, type: col.type }))),
    [columns, buildExportColumns],
  );

  const handleDelete = async (id) => {
    if (!canDelete) {
      toast.error(unauthorizedDeleteToast);
      return;
    }
    const question = typeof deleteConfirmText === 'function' ? deleteConfirmText(rows.find((r) => r.id === id)) : deleteConfirmText;
    if (!window.confirm(question)) return;
    try {
      const response = await deleteRow(id);
      // A 2xx is a delete unless the body says otherwise.
      if (response.data?.success === false) {
        toast.error(response.data.message || `${title}: could not delete row ${id}`);
      } else {
        setRows((prev) => prev.filter((r) => r.id !== id));
      }
    } catch (error) {
      console.error(`${title}: Error deleting row`, { error });
      toast.error(error?.response?.data?.message || error?.response?.data?.error || `${title}: could not delete row ${id}`);
    }
  };

  // A header action gets the same handle on the grid that a row action does. Without it a
  // master with a bulk header button has no way to reload after it runs, and the only way
  // out is remounting the whole subtree — which throws away filters, search and sort.
  const resolvedHeaderActions = typeof extraHeaderActions === 'function'
    ? extraHeaderActions({ refresh, rows, columns })
    : extraHeaderActions;
  const resolvedHeaderContent = typeof headerContent === 'function'
    ? headerContent({ refresh: fetchRows, rows, columns, openRecord: modal.open, summary })
    : headerContent;

  // An amend opens the copy as a new record in the form.
  const openRecord = modal.open;
  const handleAmend = ({ record }) => openRecord(amendCopy(workflow, record));

  const workflowRowActions = useWorkflowRowActions({
    workflow,
    masterName,
    permissions: permissionKeys,
    // Row hooks are handed openRecord too, for an Amend that opens its own copy.
    hooks: Object.fromEntries(Object.entries({ amend: handleAmend, ...workflowHooks, ...rowWorkflowHooks })
      .map(([key, hook]) => [key, (args) => hook({ ...args, openRecord })])),
    showWhen: workflowShowWhen,
    // The saved record replaces its row where the move hands one back, so a
    // long list keeps its place; otherwise the list reloads.
    onChanged: ({ saved }) => (saved?.id ? patchRow(saved) : fetchRows()),
  });
  // Delete only where the record's status still allows it, and the master's own canDeleteRow agrees.
  const showDelete = (row) => Boolean(workflow.statuses[statusOf(workflow, row[workflow.statusKey])]?.deletable)
    && (!canDeleteRow || canDeleteRow(row));

  const actions = [
    ...approvalActions,
    ...(extraActions ? extraActions({ refresh: fetchRows, rows, setRows, openEdit: (row) => handleRowClick(row), openRecord }) : []),
    ...workflowRowActions,
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
            show: showDelete,
          },
        ]
      : []),
  ];

  const handleAdd = () => openRecord(null);

  // Every row opens: its details, its edit form, or wherever the master sends it.
  // An override that only sometimes differs can still open the row: `openRecord(row)`;
  // one that opens a modal of its own reloads the list with `refresh` once that saves.
  const handleRowClick = (row) => {
    if (onRowClickOverride) {
      onRowClickOverride(row, { openRecord, refresh: fetchRows });
      return;
    }
    openRecord(row);
  };

  const handleCloseModal = modal.close;

  const handleCloseHistory = () => setHistoryRowId(null);
  // A form may hand back what it saved; the grid only needs to reload, not read that as filters.
  const handleFormSuccess = () => refresh();

  // A record opened by id alone (a link) is its row, once the rows have it — unless the form loads it.
  const openRow = loadRecord || !selectedRow?.id
    ? selectedRow
    : rows.find((row) => String(row.id) === String(selectedRow.id)) ?? selectedRow;
  // A saved record opens its details or form; a new one (or an amend's copy) the form.
  const isSaved = Boolean(openRow?.id);
  const ModalBody = isSaved ? (DetailComponent ?? FormComponent ?? MasterRecordDetails) : FormComponent;
  const isForm = ModalBody === FormComponent;
  const Modal = isForm ? FormModal : BaseModal;
  const formModalProps = isForm
    ? {
        isEditMode: isSaved,
        createLabel,
        updateLabel,
        savingLabel,
        workflow,
        // Loaded whole by the modal where the master says how; otherwise the row is the record.
        ...(loadRecord && isSaved ? { recordId: openRow.id, loadRecord } : { record: openRow }),
        masterName,
        permissions: permissionKeys,
        hooks: workflowHooks,
        showWhen: workflowShowWhen,
        onAmend: openRecord,
        ...modalProps,
      }
    // A form names its record itself; a details modal is a plain BaseModal, so
    // it is told here what it is showing.
    : { recordName: masterName, recordId: openRow?.id };

  // Adapters that inject the current rows/columns/refresh into caller-supplied
  // callbacks. Defined here (rather than inline in JSX) to satisfy the
  // "no inline arrow in JSX" lint and avoid re-rendering with new identity
  // when those captured values are unchanged.
  const boundImportApi = importApi
    ? (formData) => importApi(formData, { rows, columns, refresh })
    : undefined;
  const boundOnDownloadTemplate = onDownloadTemplate
    ? () => onDownloadTemplate({ columns: exportColumns, rows })
    : undefined;
  const boundOnExport = onExport ? () => onExport({ columns, rows }) : undefined;
  const boundOnImport = onImport
    ? () => onImport({ columns, rows, refresh })
    : undefined;

  // A new record's title can depend on what it is — an amend's copy.
  const titleOf = (title, record) => (typeof title === 'function' ? title(record) : title);

  // Keyed by record so stepping to the next one starts a fresh form.
  const renderBody = (record) => (
    <ModalBody
      key={openRow?.id ?? 'new'}
      isOpen
      onClose={handleCloseModal}
      initialData={record}
      columns={columns}
      {...{ [formSuccessProp]: handleFormSuccess }}
      {...(formProps ? formProps(record, { rows }) : {})}
    />
  );

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className={`${baseMasterContainerWidth} mx-auto`}>
        <MasterHeader
          ref={headerRef}
          title={title}
          description={description}
          onAdd={canAdd && showAdd ? handleAdd : undefined}
          userData={userData}
          permissionKey={permissionKeys.create}
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
          extraHeaderActions={resolvedHeaderActions}
        />
        {resolvedHeaderContent}
        {renderFilters ? renderFilters({ filters, applyFilters }) : null}
        {filtersConfig && (
          <BaseFilter
            onFiltersApply={applyFilters}
            filtersConfig={filtersConfig}
            disabled={loading || isFilterLoading}
          />
        )}
        <div className="mb-4 flex w-full md:justify-center" data-tour="master-search">
          <MasterSearch
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder={searchPlaceholder}
          />
        </div>
        {canRead && bulkProps ? <BulkActionBar {...bulkProps} /> : null}
        {canRead ? (
          <div data-tour="master-grid">
            <MasterTable
              {...selectionProps}
              columns={columns}
              data={filteredData}
              loading={loading}
              actions={actions}
              onRowClick={handleRowClick}
              rowClickEnabled
              infiniteScroll={infiniteScroll}
              hasMore={infiniteScroll && hasMore}
              onLoadMore={loadMore}
              isLoadingMore={isLoadingMore}
              onVisibleRowsChange={handleVisibleRowsChange}
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
              density={density}
              documentName={documentName}
            />
          </div>
        ) : (
          <UnauthorisedTable />
        )}
        <Modal
          {...formModalProps}
          isOpen={modal.isOpen && Boolean(ModalBody)}
          onClose={handleCloseModal}
          // A form titles itself (FormModal); a saved record's details by what the record is known by.
          title={(isSaved ? modalEditTitle : titleOf(modalAddTitle, openRow)) ?? (isForm ? undefined : recordTitle({ masterName, record: openRow, isNew: false, isEditable: false }))}
          maxWidth={modalMaxWidth}
          auditHead={auditHead}
          recordNav={recordNav}
        >
          {/* A record the modal loads reaches the form once the modal has it. */}
          {ModalBody && (isForm && loadRecord && isSaved ? renderBody : renderBody(openRow))}
        </Modal>
        {approvalDialog}
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
  searchKeys: PropTypes.arrayOf(PropTypes.string),
  /** Only where the modal is not "Add/Edit <masterName>" (Upload File); left out, the form titles itself. */
  /** A string, or (record) => string for a new record that says what it is (an amend's copy). */
  modalAddTitle: PropTypes.oneOfType([PropTypes.string, PropTypes.func]),
  modalEditTitle: PropTypes.string,
  modalMaxWidth: PropTypes.string,
  baseMasterContainerWidth: PropTypes.string,
  auditHead: PropTypes.string,
  permissionKeys: PropTypes.shape({
    // Any one of a list is enough.
    read: PropTypes.oneOfType([PropTypes.string, PropTypes.arrayOf(PropTypes.string)]),
    create: PropTypes.string,
    update: PropTypes.string,
    delete: PropTypes.string,
  }).isRequired,
  workflow: PropTypes.object,
  masterName: PropTypes.string.isRequired,
  workflowHooks: PropTypes.objectOf(PropTypes.func),
  rowWorkflowHooks: PropTypes.objectOf(PropTypes.func),
  workflowShowWhen: PropTypes.objectOf(PropTypes.func),
  loadRows: PropTypes.func.isRequired,
  deleteRow: PropTypes.func,
  canDeleteRow: PropTypes.func,
  deleteConfirmText: PropTypes.oneOfType([PropTypes.string, PropTypes.func]),
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
  // Omit for a read-only master — no Add button.
  FormComponent: PropTypes.elementType,
  // Receives the same props as FormComponent, plus `columns`.
  DetailComponent: PropTypes.elementType,
  formProps: PropTypes.func,
  formSuccessProp: PropTypes.string,
  createLabel: PropTypes.string,
  updateLabel: PropTypes.string,
  savingLabel: PropTypes.string,
  modalProps: PropTypes.object,
  filtersConfig: PropTypes.array,
  isFilterLoading: PropTypes.bool,
  initialFilters: PropTypes.object,
  mapFiltersForApi: PropTypes.func,
  mapRows: PropTypes.func,
  subscribeToRefresh: PropTypes.func,
  headerContent: PropTypes.oneOfType([PropTypes.node, PropTypes.func]),
  headerRef: PropTypes.object,
  showRefreshButton: PropTypes.bool,
  backUrl: PropTypes.string,
  showBack: PropTypes.bool,
  onDownloadTemplate: PropTypes.func,
  templateButtonText: PropTypes.string,
  onExport: PropTypes.func,
  onImport: PropTypes.func,
  approval: PropTypes.shape({
    updateStatus: PropTypes.func.isRequired,
    permissionKeys: PropTypes.shape({
      approve: PropTypes.string,
      reject: PropTypes.string,
    }).isRequired,
    noun: PropTypes.string,
    isPending: PropTypes.func,
  }),
  extraActions: PropTypes.func,
  getRowClassName: PropTypes.func,
  isAlertRow: PropTypes.func,
  initialSortKey: PropTypes.string,
  // Node, or a function given { refresh, rows, columns } so a bulk header action can
  // reload the grid when it finishes.
  extraHeaderActions: PropTypes.oneOfType([PropTypes.node, PropTypes.func]),
  defaultGroupByField: PropTypes.string,
  initialSortDirection: PropTypes.string,
  infiniteScroll: PropTypes.bool,
  serverSearch: PropTypes.bool,
  renderFilters: PropTypes.func,
  loadRecord: PropTypes.func,
  openParam: PropTypes.string,
  onModalClose: PropTypes.func,
  pageSize: PropTypes.number,
  showAdd: PropTypes.bool,
};

export { BaseMaster };
