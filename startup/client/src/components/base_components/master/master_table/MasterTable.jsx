import { useState, useCallback, useMemo } from 'react';
import { Eye } from 'lucide-react';
import { FileViewerModal } from '@/components/common/FileViewerModal';
import { formatDateForDisplay, formatDateTimeForDisplay } from '@utils/dateTimeUtils';
import { formatTime } from '@utils/formattingUtils';
import { NbNextDataGrid } from '@/components/nbnext_data_grid';
import PropTypes from 'prop-types';
import { MdiIcon } from '../../MdiIcon';
import { measureColumnWidth, measureActionsWidth } from './columnWidths';

// A row action shows unless its `show` says otherwise.
const isActionVisible = (action, row) => !action.show || action.show(row);

/** The swatch is the value itself, so its colour cannot come from a class. */
const swatchStyle = (color) => ({ backgroundColor: color });

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
  /** `(rows) => void`; the rows in the order the grid shows them. */
  onVisibleRowsChange,
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
  viewMode,
  kanbanField,
  kanbanLaneValues,
}) => {
  const [viewerState, setViewerState] = useState({ open: false, url: '', mime: '', title: '' });

  const handleCloseViewer = useCallback(() => {
    setViewerState({ open: false, url: '', mime: '', title: '' });
  }, []);

  const openFileViewer = useCallback((href, mime, title) => {
    setViewerState({ open: true, url: href, mime: mime || '', title: title || 'File Preview' });
  }, []);

  // Widths sized to what the rows hold (see columnWidths.js) — a column's own `width`
  // wins — measured apart from the columns below, so only a change of columns, rows
  // or actions re-measures them.
  const { columnWidths, actionsWidth } = useMemo(() => ({
    columnWidths: (columns || []).map((column) => (Number.isFinite(column.width) ? column.width : measureColumnWidth(column, data))),
    actionsWidth: actions?.length ? measureActionsWidth(actions, data, isActionVisible) : 0,
  }), [columns, data, actions]);

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
        if (Number.isFinite(column.width)) {
          gridCol.width = column.width;
        }
        if (typeof column.getExportValue === 'function') {
          gridCol.getExportValue = column.getExportValue;
          gridCol.valueGetter = ({ row }) => {
            const v = column.getExportValue({ row });
            return v == null || v === '' ? '-' : v;
          };
        } else {
          // A column holding a linked record or a list of them — an item's group,
          // its UOMs — is sorted, grouped, filtered and exported by what it draws
          // rather than by the record behind it, which every row would otherwise
          // read as the same "[object Object]" and land in one group.
          //
          // Only records and lists are read this way. A column whose value is
          // already a number, a date or a word keeps that value, so a formatted
          // "1,234.00" still sorts as the number it is, and a column drawing a
          // badge or a bar falls back to its value the same way.
          gridCol.valueGetter = ({ row }) => {
            const raw = row[fieldKey];
            if (raw === null || typeof raw !== 'object') return raw;
            try {
              const rendered = column.render(row);
              return typeof rendered === 'string' || typeof rendered === 'number' ? rendered : raw;
            } catch {
              return raw;
            }
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

      if (column.type === 'color') {
        return {
          field: fieldKey,
          headerName,
          type: sortType,
          renderCell: ({ row }) => {
            const value = row[fieldKey];
            if (!value) return '-';
            return (
              <span className="inline-flex items-center gap-2">
                <span className="h-4 w-4 rounded border border-gray-300" style={swatchStyle(value)} />
                <span className="font-mono uppercase">{value}</span>
              </span>
            );
          },
        };
      }

      if (column.type === 'icon') {
        return {
          field: fieldKey,
          headerName,
          type: sortType,
          renderCell: ({ row }) => {
            const value = row[fieldKey];
            if (!value) return '-';
            return (
              <span className="inline-flex items-center gap-2">
                <MdiIcon name={value} size={18} color={column.colorField ? row[column.colorField] : undefined} />
                <span>{value}</span>
              </span>
            );
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
      cols[i].width = columnWidths[i];
    });

    if (actions && actions.length > 0) {
      cols.push({
        field: '__actions__',
        headerName: 'Actions',
        sortable: false,
        width: actionsWidth,
        renderCell: ({ row }) => {
          const visibleActions = actions.filter((action) => isActionVisible(action, row));
          if (visibleActions.length === 0) return null;
          return (
            <div className="flex flex-nowrap items-center gap-2 whitespace-nowrap">
              {visibleActions.map((action, idx) => {
                // An action may draw itself instead of being a button — a
                // status chip, a small menu. Clicks stay inside it so the row
                // selection handler doesn't also fire.
                if (action.additionalButton) {
                  return (
                    <span
                      key={idx}
                      className="inline-flex shrink-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {action.additionalButton(row)}
                    </span>
                  );
                }
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
                    className={`inline-flex shrink-0 items-center px-2 py-1 border text-xs font-medium rounded whitespace-nowrap ${
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
  }, [columns, actions, openFileViewer, columnWidths, actionsWidth]);

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
        onVisibleRowsChange={onVisibleRowsChange}
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
        viewMode={viewMode}
        kanbanField={kanbanField}
        kanbanLaneValues={kanbanLaneValues}
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
      width: PropTypes.number,
      render: PropTypes.func,
      getExportValue: PropTypes.func,
    })
  ).isRequired,
  data: PropTypes.array.isRequired,
  loading: PropTypes.bool,
  actions: PropTypes.arrayOf(
    PropTypes.shape({
      /** A string, or a function of the row for labels that flip with state.
       *  Not required for an `additionalButton` action, which draws its own. */
      label: PropTypes.oneOfType([PropTypes.string, PropTypes.func]),
      icon: PropTypes.oneOfType([PropTypes.node, PropTypes.func]),
      /** Required for a button action; an `additionalButton` one wires its own. */
      onClick: PropTypes.func,
      type: PropTypes.oneOfType([
        PropTypes.oneOf(['primary', 'danger', 'success', 'warning', 'default']),
        PropTypes.func
      ]),
      /** Optional: whether this action appears for a row. */
      show: PropTypes.func,
      /** Draw the action yourself for this row instead of rendering a button. */
      additionalButton: PropTypes.func,
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
  onVisibleRowsChange: PropTypes.func,
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
  /** Opening view — 'kanban' lays the rows out in lanes of `kanbanField`. */
  viewMode: PropTypes.string,
  kanbanField: PropTypes.string,
  kanbanLaneValues: PropTypes.arrayOf(PropTypes.oneOfType([PropTypes.string, PropTypes.number])),
};

export { MasterTable };
