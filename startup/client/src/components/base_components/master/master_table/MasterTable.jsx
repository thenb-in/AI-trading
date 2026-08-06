import { useState, useCallback, useMemo } from 'react';
import { Eye } from 'lucide-react';
import { FileViewerModal } from '@/components/common/FileViewerModal';
import { formatDateForDisplay, formatDateTimeForDisplay } from '@utils/dateTimeUtils';
import { formatTime } from '@utils/formattingUtils';
import { NbNextDataGrid } from '@/components/nbnext_data_grid';
import PropTypes from 'prop-types';

// Row action fields may be given as a plain value or as a function of the row,
// for actions that flip with the row's state (Hold/Resume, Close/Reopen).
const perRow = (value, row) => (typeof value === 'function' ? value(row) : value);

const MasterTable = ({
  columns,
  data,
  loading,
  actions = [],
  emptyMessage = "No data found",
  loadingMessage = "Loading...",
  onRowClick,
  rowClickEnabled = false,
  infiniteScroll = false,
  hasMore = false,
  onLoadMore,
  isLoadingMore = false,
  /** Field to group rows by on first render; the user can retoggle from the
   *  column menu. Omit to start ungrouped. */
  defaultGroupByField = null,
  getRowId,
  density,
  documentName,
  enableRowSelection = false,
  selectedRowIds,
  onSelectionChange,
  /** `(row) => boolean`; rows it flags are tinted red (e.g. duplicates to review). */
  isAlertRow,

  showGridExport = true,
  exportReport = { title: 'Export', slug: 'export' },
  showInsightsAsHeader = true,
  showEmptyColumns = true,
  /**
   * The grid folds columns whose value is identical across every row into the
   * Insights header. Set false when such a column is what identifies the row —
   * ten runs of the same report still need their "Report" column.
   */
  hideConstantColumns = true,
}) => {
  const [viewerState, setViewerState] = useState({ open: false, url: '', mime: '', title: '' });

  const handleCloseViewer = useCallback(() => {
    setViewerState({ open: false, url: '', mime: '', title: '' });
  }, []);

  const openFileViewer = useCallback((href, mime, title) => {
    setViewerState({ open: true, url: href, mime: mime || '', title: title || 'File Preview' });
  }, []);

  const gridColumns = useMemo(() => {
    const cols = (columns || []).map((column) => {
      const fieldKey = column.key || column.id;
      const headerName = column.label || column.display_name || fieldKey;

      // `type` (and `format`) must flow through to NbNextDataGrid so sortRows
      // can pick the right comparator — e.g. date columns sort chronologically
      // instead of falling back to string localeCompare on YYYY-MM-DD vs ISO.
      const sortType = column.format === 'date' || column.format === 'datetime'
        ? column.format
        : column.type;

      if (typeof column.render === 'function') {
        const gridCol = {
          field: fieldKey,
          headerName,
          type: sortType || 'string',
          renderCell: ({ row }) => {
            try {
              const rendered = column.render(row);
              if (rendered == null || rendered === '') return '-';
              return rendered;
            } catch (error) {
              console.error('Error in custom render function for column:', fieldKey, error);
              return <span className="text-red-500">Render Error</span>;
            }
          },
        };
        if (typeof column.getExportValue === 'function') {
          gridCol.getExportValue = column.getExportValue;
          gridCol.valueGetter = ({ row }) => {
            const v = column.getExportValue({ row });
            return v == null || v === '' ? '-' : v;
          };
        }
        return gridCol;
      }

      if (column.type === 'file') {
        return {
          field: fieldKey,
          headerName,
          type: sortType,
          renderCell: ({ row }) => {
            const value = row[fieldKey];
            if (!value) return <span>-</span>;
            const apiBaseUrl = import.meta.env.VITE_API_URL;
            let href = value;
            if (apiBaseUrl && !/^https?:/i.test(href)) {
              try {
                const origin = new URL(apiBaseUrl).origin;
                href = new URL(href, origin).toString();
              } catch (_err) {
                void _err;
              }
            }
            const handleClick = (e) => {
              e.stopPropagation();
              openFileViewer(href, row.bill_mime_type, 'Bill Preview');
            };
            return (
              <button
                onClick={handleClick}
                className="text-blue-600 hover:text-blue-800 inline-flex items-center"
                title="View file"
              >
                <Eye className="w-4 h-4" />
              </button>
            );
          },
        };
      }

      if (column.type === 'date') {
        return {
          field: fieldKey,
          headerName,
          type: 'date',
          renderCell: ({ row }) => (row[fieldKey] ? formatDateForDisplay(row[fieldKey]) : '-'),
        };
      }

      if (column.type === 'datetime') {
        return {
          field: fieldKey,
          headerName,
          type: 'datetime',
          renderCell: ({ row }) => (row[fieldKey] ? formatDateTimeForDisplay(row[fieldKey]) : '-'),
        };
      }

      if (column.type === 'time') {
        return {
          field: fieldKey,
          headerName,
          type: 'time',
          renderCell: ({ row }) => (row[fieldKey] ? formatTime(row[fieldKey]) : '-'),
        };
      }

      if (column.type === 'select' && Array.isArray(column.options)) {
        const lookup = new Map(column.options.map((o) => [o.value, o.label]));
        return {
          field: fieldKey,
          headerName,
          type: sortType,
          renderCell: ({ row }) => {
            const v = row[fieldKey];
            if (v == null) return '-';
            return lookup.get(v) ?? v;
          },
          getExportValue: ({ row }) => {
            const v = row[fieldKey];
            if (v == null) return '';
            return lookup.get(v) ?? v;
          },
        };
      }

      if (column.type === 'boolean') {
        return {
          field: fieldKey,
          headerName,
          type: 'boolean',
          renderCell: ({ row }) => {
            const v = row[fieldKey];
            if (v == null) return '-';
            return v === true ? 'Yes' : 'No';
          },
        };
      }

      return {
        field: fieldKey,
        headerName,
        type: sortType,
        valueGetter: ({ row }) => {
          const v = row[fieldKey];
          return v == null || v === '' ? '-' : v;
        },
      };
    });

    // Carry `skip_insight` through the column transform above. Each branch
    // builds a fresh gridCol object, so this metadata would otherwise be
    // dropped and NbNextDataGrid's constant-column detection would wrongly
    // promote the column to the insights panel. cols is 1:1 with the source
    // columns here (actions column is appended below).
    (columns || []).forEach((column, i) => {
      if (!cols[i]) return;
      if (column.skip_insight === true) cols[i].skip_insight = true;
      if (column.is_export === false) cols[i].is_export = false;
    });

    if (actions && actions.length > 0) {
      cols.push({
        field: '__actions__',
        headerName: 'Actions',
        sortable: false,
        width: Math.max(160, 100 * actions.length),
        renderCell: ({ row }) => {
          const visibleActions = actions.filter((action) =>
            typeof action.show === 'function' ? action.show(row) !== false : true
          );
          if (visibleActions.length === 0) return null;
          return (
            <div className="flex items-center space-x-2">
              {visibleActions.map((action, idx) => {
                const handleClick = (e) => {
                  e.stopPropagation();
                  action.onClick(row.id, row);
                };
                // An action that flips with the row — Hold/Resume, Close/Reopen
                // — states its label and colour as a function of that row.
                const label = perRow(action.label, row);
                const type = perRow(action.type, row);
                return (
                  <button
                    key={idx}
                    onClick={handleClick}
                    className={`inline-flex items-center px-2 py-1 border text-xs font-medium rounded ${
                      type === 'danger'
                        ? 'border-red-300 text-red-700 bg-white hover:bg-red-50 focus:ring-2 focus:ring-red-500'
                        : type === 'primary'
                          ? 'border-blue-300 text-blue-700 bg-white hover:bg-blue-50 focus:ring-2 focus:ring-blue-500'
                          : type === 'success'
                            ? 'border-green-300 text-green-700 bg-white hover:bg-green-50 focus:ring-2 focus:ring-green-500'
                            : type === 'warning'
                              ? 'border-amber-300 text-amber-700 bg-white hover:bg-amber-50 focus:ring-2 focus:ring-amber-500'
                              : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50 focus:ring-2 focus:ring-offset-2 focus:ring-gray-500'
                    }`}
                  >
                    {action.icon && <span className="mr-1">{perRow(action.icon, row)}</span>}
                    {label}
                  </button>
                );
              })}
            </div>
          );
        },
      });
    }

    return cols;
  }, [columns, actions, openFileViewer]);

  const handleGridRowClick = useCallback(
    (row) => {
      if (rowClickEnabled && typeof onRowClick === 'function' && row) {
        onRowClick(row);
      }
    },
    [rowClickEnabled, onRowClick]
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="text-gray-500">{loadingMessage}</div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="text-gray-500">{emptyMessage}</div>
      </div>
    );
  }

  return (
    <>
      <NbNextDataGrid
        columns={gridColumns}
        rows={data}
        onRowClick={rowClickEnabled ? handleGridRowClick : null}
        defaultGroupByField={defaultGroupByField}
        infiniteScroll={infiniteScroll}
        hasMore={hasMore}
        onLoadMore={onLoadMore}
        isLoadingMore={isLoadingMore}
        theme="master"
        getRowId={getRowId}
        density={density}
        documentName={documentName}
        enableRowSelection={enableRowSelection}
        selectedRowIds={selectedRowIds}
        onSelectionChange={onSelectionChange}
        isAlertRow={isAlertRow}

        showExcelExport={showGridExport}
        exportReport={exportReport}
        showInsightsAsHeader={showInsightsAsHeader}
        showEmptyColumns={showEmptyColumns}
        hideConstantColumns={hideConstantColumns}
      />
      <FileViewerModal
        isOpen={viewerState.open}
        onClose={handleCloseViewer}
        fileUrl={viewerState.url}
        mimeType={viewerState.mime}
        title={viewerState.title}
      />
    </>
  );
};

MasterTable.propTypes = {
  columns: PropTypes.arrayOf(
    PropTypes.shape({
      key: PropTypes.string,
      id: PropTypes.string,
      label: PropTypes.string,
      display_name: PropTypes.string,
      // The full vocabulary the server's column constants actually emit. Only
      // file/date/datetime/time/select/boolean get special rendering above;
      // the rest fall through to text. Listing them all keeps a typo an error
      // without making a legitimate server column one.
      type: PropTypes.oneOf([
        'text', 'string', 'number', 'select', 'datetime', 'date', 'time',
        'boolean', 'file', 'array', 'object', 'json', 'status', 'duration',
      ]),
      options: PropTypes.array,
      render: PropTypes.func,
      getExportValue: PropTypes.func,
    })
  ).isRequired,
  data: PropTypes.array.isRequired,
  loading: PropTypes.bool,
  actions: PropTypes.arrayOf(
    PropTypes.shape({
      /** A string, or a function of the row for labels that flip with state. */
      label: PropTypes.oneOfType([PropTypes.string, PropTypes.func]).isRequired,
      icon: PropTypes.oneOfType([PropTypes.node, PropTypes.func]),
      onClick: PropTypes.func.isRequired,
      type: PropTypes.oneOfType([
        PropTypes.oneOf(['primary', 'danger', 'success', 'warning', 'default']),
        PropTypes.func
      ]),
      /** Optional: hide this action for a row by returning false. */
      show: PropTypes.func,
    })
  ),
  emptyMessage: PropTypes.string,
  loadingMessage: PropTypes.string,
  onRowClick: PropTypes.func,
  rowClickEnabled: PropTypes.bool,
  defaultGroupByField: PropTypes.string,
  infiniteScroll: PropTypes.bool,
  hasMore: PropTypes.bool,
  onLoadMore: PropTypes.func,
  isLoadingMore: PropTypes.bool,
  getRowId: PropTypes.func,
  density: PropTypes.oneOf(['compact', 'standard', 'comfortable']),
  documentName: PropTypes.string,
  enableRowSelection: PropTypes.bool,
  selectedRowIds: PropTypes.oneOfType([PropTypes.array, PropTypes.instanceOf(Set)]),
  onSelectionChange: PropTypes.func,
  isAlertRow: PropTypes.func,
  showGridExport: PropTypes.bool,
  exportReport: PropTypes.shape({ title: PropTypes.string, slug: PropTypes.string }),
  showInsightsAsHeader: PropTypes.bool,
  showEmptyColumns: PropTypes.bool,
  hideConstantColumns: PropTypes.bool,
};

export { MasterTable };
