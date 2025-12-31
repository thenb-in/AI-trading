import { useState, useCallback, useEffect } from 'react';
import { Eye } from 'lucide-react';
import { FileViewerModal } from '../../../common/FileViewerModal';
import PropTypes from 'prop-types';

// Utility function to format date for display
const formatDateForDisplay = (dateValue) => {
  if (!dateValue) return '-';

  try {
    const date = new Date(dateValue);
    if (isNaN(date.getTime())) return dateValue; // Return original if invalid date

    // Format as local date and time
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  } catch (error) {
    console.warn('Error formatting date:', error);
    return dateValue; // Return original if formatting fails
  }
};

// Utility function to format date only for display (without time)
const formatDateOnlyForDisplay = (dateValue) => {
  if (!dateValue) return '-';

  try {
    const date = new Date(dateValue);
    if (isNaN(date.getTime())) return dateValue;

    // Format as local date only (YYYY-MM-DD)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  } catch (error) {
    console.warn('Error formatting date only:', error);
    return dateValue;
  }
};

const MasterTable = ({
  columns,
  data,
  loading,
  actions = [],
  emptyMessage = "No data found",
  loadingMessage = "Loading...",
  onRowClick,
  rowClickEnabled = false,
  selectRow = false,
  onSelectedRowsChange
}) => {
  const [viewerState, setViewerState] = useState({ open: false, url: '', mime: '', title: '' });
  const [selectedRows, setSelectedRows] = useState(new Set());

  // Handle close viewer
  const handleCloseViewer = useCallback(() => {
    setViewerState({ open: false, url: '', mime: '', title: '' });
  }, []);

  // Update parent when selected rows change
  useEffect(() => {
    if (onSelectedRowsChange && selectRow) {
      const selectedData = data.filter(item => selectedRows.has(item.id));
      onSelectedRowsChange(selectedData, Array.from(selectedRows));
    }
  }, [selectedRows, data, onSelectedRowsChange, selectRow]);

  // Handle individual row selection
  const handleRowSelect = useCallback((rowId, checked) => {
    setSelectedRows(prev => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(rowId);
      } else {
        newSet.delete(rowId);
      }
      return newSet;
    });
  }, []);

  // Handle select all
  const handleSelectAll = useCallback((checked) => {
    if (checked) {
      const allIds = new Set(data.map(item => item.id));
      setSelectedRows(allIds);
    } else {
      setSelectedRows(new Set());
    }
  }, [data]);

  // Check if all rows are selected
  const isAllSelected = data.length > 0 && selectedRows.size === data.length;
  const isIndeterminate = selectedRows.size > 0 && selectedRows.size < data.length;

  // Handle checkbox ref for indeterminate state
  const checkboxRef = useCallback((input) => {
    if (input) {
      input.indeterminate = isIndeterminate;
    }
  }, [isIndeterminate]);

  // Render cell content
  const renderCell = useCallback((item, column) => {
    const fieldKey = column.key || column.id;

    // Check if there's a custom render function
    if (column.render && typeof column.render === 'function') {
      try {
        return column.render(item);
      } catch (error) {
        console.error('Error in custom render function for column:', column.id, error);
        return <span className="text-red-500">Render Error</span>;
      }
    }

    // Render display value
    let displayValue = item[fieldKey] || '-';

    // Format date/time for display
    if (column.type === 'datetime' && item[fieldKey]) {
      displayValue = formatDateForDisplay(item[fieldKey]);
    } else if (column.type === 'date' && item[fieldKey]) {
      displayValue = formatDateOnlyForDisplay(item[fieldKey]);
    }

    // Format select values for display
    if (column.type === 'select' && column.options && item[fieldKey] !== null && item[fieldKey] !== undefined) {
      const option = column.options.find(opt => opt.value === item[fieldKey]);
      displayValue = option ? option.label : item[fieldKey];
    }

    // Format boolean values for display
    if (column.type === 'boolean' && item[fieldKey] !== null && item[fieldKey] !== undefined) {
      displayValue = item[fieldKey] === true ? 'Yes' : 'No';
    }

    // Render file (eye icon link)
    if (column.type === 'file') {
      if (item[fieldKey]) {
        const apiBaseUrl = import.meta.env.VITE_API_URL;
        let href = item[fieldKey];
        if (apiBaseUrl && !/^https?:/i.test(href)) {
          try {
            const origin = new URL(apiBaseUrl).origin;
            href = new URL(href, origin).toString();
          } catch (_err) {
            void _err;
          }
        }
        const handleFileClick = (e) => {
          e.stopPropagation();
          setViewerState({ open: true, url: href, mime: item.bill_mime_type || '', title: 'Bill Preview' });
        };

        return (
          <button
            onClick={handleFileClick}
            className="text-blue-600 hover:text-blue-800 inline-flex items-center"
            title="View file"
          >
            <Eye className="w-4 h-4" />
          </button>
        );
      }
      return <span>-</span>;
    }

    return (
      <span>
        {displayValue}
      </span>
    );
  }, []);

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
    <div className="overflow-x-auto">
      <table className="min-w-full bg-white border border-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {selectRow && (
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200 w-12">
                <input
                  type="checkbox"
                  checked={isAllSelected}
                  ref={checkboxRef}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                />
              </th>
            )}
            {columns?.map((column, index) => (
              <th
                key={column.key || column.id || index}
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200"
              >
                {column.label || column.display_name || column.key || column.id}
              </th>
            ))}
            {(actions?.length > 0) && (
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200">
                Actions
              </th>
            )}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {data.map((item) => {
            const handleRowClick = () => {
              if (rowClickEnabled && onRowClick) {
                onRowClick(item);
              }
            };

            const isRowSelected = selectedRows.has(item.id);

            return (
              <tr key={item.id} className={`${rowClickEnabled ? "hover:bg-gray-50 cursor-pointer" : "hover:bg-gray-50"} ${isRowSelected ? "bg-blue-50" : ""}`} onClick={handleRowClick}>
                {selectRow && (
                  <td 
                    className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 border-b border-gray-200"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <input
                      type="checkbox"
                      checked={isRowSelected}
                      onChange={(e) => handleRowSelect(item.id, e.target.checked)}
                      className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                    />
                  </td>
                )}
                {columns?.map((column, colIndex) => (
                  <td
                    key={column.key || column.id || colIndex}
                    className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 border-b border-gray-200"
                 >
                    {renderCell(item, column)}
                  </td>
                ))}

                {/* Actions Column */}
                {actions?.length > 0 && (<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 border-b border-gray-200">
                  <div className="flex items-center space-x-2">
                    {/* Custom actions */}
                    {actions.map((action, actionIndex) => {
                      const handleActionClick = (e) => {
                        e.stopPropagation();
                        action.onClick(item.id, item);
                      };

                      return (
                        <button
                          key={actionIndex}
                          onClick={handleActionClick}
                          className={`inline-flex items-center px-2 py-1 border text-xs font-medium rounded ${
                            action.type === 'danger'
                              ? 'border-red-300 text-red-700 bg-white hover:bg-red-50 focus:ring-2 focus:ring-red-500'
                              : action.type === 'primary'
                              ? 'border-blue-300 text-blue-700 bg-white hover:bg-blue-50 focus:ring-2 focus:ring-blue-500'
                              : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50 focus:ring-2 focus:ring-offset-2 focus:ring-gray-500'
                          }`}
                        >
                          {action.icon && <span className="mr-1">{action.icon}</span>}
                          {action.label}
                        </button>
                      );
                    })}
                  </div>
                </td>)}
              </tr>
            );
          })}
        </tbody>
      </table>
      <FileViewerModal
        isOpen={viewerState.open}
        onClose={handleCloseViewer}
        fileUrl={viewerState.url}
        mimeType={viewerState.mime}
        title={viewerState.title}
      />
    </div>
  );
};

MasterTable.propTypes = {
  columns: PropTypes.arrayOf(PropTypes.shape({
    key: PropTypes.string,
    id: PropTypes.string,
    label: PropTypes.string,
    display_name: PropTypes.string,
    type: PropTypes.oneOf(['text', 'number', 'select', 'datetime', 'date', 'boolean', 'file']),
    options: PropTypes.array
  })).isRequired,
  data: PropTypes.array.isRequired,
  loading: PropTypes.bool,
  actions: PropTypes.arrayOf(PropTypes.shape({
    label: PropTypes.string.isRequired,
    icon: PropTypes.node,
    onClick: PropTypes.func.isRequired,
    type: PropTypes.oneOf(['primary', 'danger', 'default'])
  })),
  emptyMessage: PropTypes.string,
  loadingMessage: PropTypes.string,
  onRowClick: PropTypes.func,
  rowClickEnabled: PropTypes.bool,
  selectRow: PropTypes.bool,
  onSelectedRowsChange: PropTypes.func
};

export { MasterTable };

