import { useState, useEffect, useMemo, useCallback } from 'react';
import PropTypes from 'prop-types';
import { toast } from 'react-toastify';
import { useDataContext } from '@context/useDataContext';
import { MasterHeader } from './master_header/MasterHeader';
import { MasterTable } from './master_table/MasterTable';
import { MasterModal } from './master_modal/MasterModal';
import { MasterSearch } from './MasterSearch';
import { BaseFilter } from '../../base_filter/BaseFilter';
import { hasPermission } from '@utils/hasPermission';
import { UnauthorisedTable } from '@startup/components/common/UnauthorisedTable';

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
  deleteConfirmText,
  rowsKey,
  extractResponse,
  onRowClickOverride,
  unauthorizedToast = 'You are not authorized to view this table',
  unauthorizedDeleteToast = 'You are not authorized to delete this table',
  fetchSuccessToast,
  fetchFailureToast,
  showExport = false,
  showImport = false,
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
  onDownloadTemplate,
  templateButtonText,
  onExport,
  onImport,
  extraActions,
  getRowClassName,
  initialSortKey,
  initialSortDirection,

  showGridExport = true,
  exportReport = { title: 'Export', slug: 'export' },
  showInsightsAsHeader = true,
  showEmptyColumns = true,
}) => {
  const [rows, setRows] = useState([]);
  const [columns, setColumns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState(initialFilters);
  const { userData } = useDataContext();

  const canRead = hasPermission(userData, permissionKeys.read);
  const canCreate = permissionKeys.create;
  const canDelete = permissionKeys.delete && hasPermission(userData, permissionKeys.delete);

  const fetchRows = useCallback(async (filterOverride) => {
    if (!canRead) {
      toast.error(unauthorizedToast);
      return;
    }
    try {
      setLoading(true);
      const apiFilters = filterOverride ?? filters;
      const mappedFilters = mapFiltersForApi ? mapFiltersForApi(apiFilters) : apiFilters;
      const response = await loadRows(mappedFilters);
      if (response.data.success || extractResponse) {
        const extracted = extractResponse
          ? extractResponse(response)
          : { rows: response.data.data[rowsKey] || [], columns: response.data.data.columns || [] };
        setRows(extracted.rows);
        setColumns(extracted.columns);
        if (fetchSuccessToast) toast.success(fetchSuccessToast);
      }
    } catch (error) {
      console.error(`${title}: Error fetching rows`, { error });
      if (fetchFailureToast) toast.error(fetchFailureToast);
    } finally {
      setLoading(false);
    }
  }, [canRead, loadRows, rowsKey, fetchSuccessToast, fetchFailureToast, unauthorizedToast, title, filters, mapFiltersForApi, extractResponse]);

  useEffect(() => {
    fetchRows();
  }, []);

  const filteredData = useMemo(() => {
    if (!searchQuery) return rows;
    const keys = (columns || []).map((c) => c.id);
    const q = searchQuery.toLowerCase();
    return rows.filter((row) => keys.some((k) => String(row?.[k] ?? '').toLowerCase().includes(q)));
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
    ...(canDelete
      ? [
          {
            label: 'Delete',
            onClick: (id) => handleDelete(id),
            type: 'danger',
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
    setSelectedRow(row);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedRow(null);
  };

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
          onAdd={handleAdd}
          userData={userData}
          permissionKey={canCreate}
          addButtonText={addButtonText}
          onRefresh={fetchRows}
          showRefresh={showRefreshButton}
          showExport={showExport}
          showImport={showImport}
          exportColumns={showExport ? exportColumns : undefined}
          exportRows={showExport ? rows : undefined}
          exportFileName={exportFileName}
          importApi={boundImportApi}
          onDownloadTemplate={boundOnDownloadTemplate}
          templateButtonText={templateButtonText}
          onExport={boundOnExport}
          onImport={boundOnImport}
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
            rowClickEnabled
            getRowClassName={getRowClassName}
            initialSortKey={initialSortKey}
            initialSortDirection={initialSortDirection}
            
            
            showGridExport={showGridExport}
            exportReport={exportReport}
            showInsightsAsHeader={showInsightsAsHeader}
            showEmptyColumns={showEmptyColumns}
          />
        ) : (
          <UnauthorisedTable />
        )}
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
      </div>
    </div>
  );
};

BaseMaster.propTypes = {
  title: PropTypes.string.isRequired,
  description: PropTypes.string,
  addButtonText: PropTypes.string.isRequired,
  searchPlaceholder: PropTypes.string,
  modalAddTitle: PropTypes.string.isRequired,
  modalEditTitle: PropTypes.string.isRequired,
  modalMaxWidth: PropTypes.string,
  baseMasterContainerWidth: PropTypes.string,
  auditHead: PropTypes.string,
  permissionKeys: PropTypes.shape({
    read: PropTypes.string.isRequired,
    create: PropTypes.string.isRequired,
    delete: PropTypes.string,
  }).isRequired,
  loadRows: PropTypes.func.isRequired,
  deleteRow: PropTypes.func,
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
  importApi: PropTypes.func,
  buildExportColumns: PropTypes.func,
  FormComponent: PropTypes.elementType.isRequired,
  formProps: PropTypes.func,
  formSuccessProp: PropTypes.string,
  filtersConfig: PropTypes.array,
  isFilterLoading: PropTypes.bool,
  initialFilters: PropTypes.object,
  mapFiltersForApi: PropTypes.func,
  headerRef: PropTypes.object,
  showRefreshButton: PropTypes.bool,
  onDownloadTemplate: PropTypes.func,
  templateButtonText: PropTypes.string,
  onExport: PropTypes.func,
  onImport: PropTypes.func,
  extraActions: PropTypes.func,
  getRowClassName: PropTypes.func,
  initialSortKey: PropTypes.string,
  initialSortDirection: PropTypes.string,
};

export { BaseMaster };
