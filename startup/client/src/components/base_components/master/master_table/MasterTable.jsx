import { useState, useCallback, useMemo } from 'react';
import { Eye } from 'lucide-react';
import { FileViewerModal } from '@/components/common/FileViewerModal';
import { formatDateForDisplay, formatDateTimeForDisplay } from '@utils/dateTimeUtils';
import { NbNextDataGrid } from '@/components/nbnext_data_grid';
import PropTypes from 'prop-types';

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
  getRowId,
  density,
  documentName,
  enableRowSelection = false,
  selectedRowIds,
  onSelectionChange,
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
        return {
          field: fieldKey,
          headerName,
          type: sortType,
          renderCell: ({ row }) => {
            try {
              return column.render(row);
            } catch (error) {
              console.error('Error in custom render function for column:', fieldKey, error);
              return <span className="text-red-500">Render Error</span>;
            }
          },
        };
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
                return (
                  <button
                    key={idx}
                    onClick={handleClick}
                    className={`inline-flex items-center px-2 py-1 border text-xs font-medium rounded ${
                      action.type === 'danger'
                        ? 'border-red-300 text-red-700 bg-white hover:bg-red-50 focus:ring-2 focus:ring-red-500'
                        : action.type === 'primary'
                          ? 'border-blue-300 text-blue-700 bg-white hover:bg-blue-50 focus:ring-2 focus:ring-blue-500'
                          : action.type === 'success'
                            ? 'border-green-300 text-green-700 bg-white hover:bg-green-50 focus:ring-2 focus:ring-green-500'
                            : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50 focus:ring-2 focus:ring-offset-2 focus:ring-gray-500'
                    }`}
                  >
                    {action.icon && <span className="mr-1">{action.icon}</span>}
                    {action.label}
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
      type: PropTypes.oneOf(['text', 'number', 'select', 'datetime', 'date', 'boolean', 'file']),
      options: PropTypes.array,
      render: PropTypes.func,
    })
  ).isRequired,
  data: PropTypes.array.isRequired,
  loading: PropTypes.bool,
  actions: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string.isRequired,
      icon: PropTypes.node,
      onClick: PropTypes.func.isRequired,
      type: PropTypes.oneOf(['primary', 'danger', 'success', 'default']),
      /** Optional: hide this action for a row by returning false. */
      show: PropTypes.func,
    })
  ),
  emptyMessage: PropTypes.string,
  loadingMessage: PropTypes.string,
  onRowClick: PropTypes.func,
  rowClickEnabled: PropTypes.bool,
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
};

export { MasterTable };
