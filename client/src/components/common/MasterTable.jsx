import { useState, useCallback } from 'react';
import { Save, X, Eye } from 'lucide-react';
import { FileViewerModal } from './FileViewerModal';
import PropTypes from 'prop-types';
import { hasPermission } from '@utils/startup/hasPermission';
import { useDataContext } from '../../context/startup/useDataContext';
import { toast } from 'react-toastify';
import { TextField } from '@startup/safe_choice';

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

// Utility function to format date for input field
const formatDateForInput = (dateValue) => {
  if (!dateValue) return '';
  
  try {
    const date = new Date(dateValue);
    if (isNaN(date.getTime())) return dateValue;
    
    // Format as ISO string for input field (YYYY-MM-DDTHH:mm:ss)
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    
    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
  } catch (error) {
    console.warn('Error formatting date for input:', error);
    return dateValue;
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

// Utility function to format date only for input field
const formatDateOnlyForInput = (dateValue) => {
  if (!dateValue) return '';
  
  try {
    const date = new Date(dateValue);
    if (isNaN(date.getTime())) return dateValue;
    
    // Format as YYYY-MM-DD for date input
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  } catch (error) {
    console.warn('Error formatting date only for input:', error);
    return dateValue;
  }
};

// Utility function to parse input date back to original format
const parseInputDate = (inputValue) => {
  if (!inputValue) return null;
  
  try {
    const date = new Date(inputValue);
    if (isNaN(date.getTime())) return inputValue;
    
    // Return ISO string in UTC to preserve original timezone
    return date.toISOString();
  } catch (error) {
    console.warn('Error parsing input date:', error);
    return inputValue;
  }
};

// Utility function to parse date only input
const parseInputDateOnly = (inputValue) => {
  if (!inputValue) return null;
  
  try {
    const date = new Date(inputValue);
    if (isNaN(date.getTime())) return inputValue;
    
    // Return date only in YYYY-MM-DD format
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  } catch (error) {
    console.warn('Error parsing input date only:', error);
    return inputValue;
  }
};

const MasterTable = ({ 
  columns, 
  data, 
  loading, 
  actions = [],
  onSave,
  emptyMessage = "No data found",
  loadingMessage = "Loading...",
  editPermissionKey = ''
}) => {
  const [editingRow, setEditingRow] = useState(null);
  const [editData, setEditData] = useState({});
  const [savingRow, setSavingRow] = useState(null);
  const { userData } = useDataContext();
  const [viewerState, setViewerState] = useState({ open: false, url: '', mime: '', title: '' });
  console.log('columns', columns);
  console.log('data', data);

  // Handle row edit mode - ONLY call this when first entering edit mode
  const handleRowEdit = useCallback((rowId) => {
    // Only check permission if editPermissionKey is provided
    if (editPermissionKey && !hasPermission(userData, editPermissionKey)) {
      toast.error('You are not authorized to edit this table');
      return;
    }
    // If already editing this row, don't reset editData
    if (editingRow === rowId) {
      return;
    }
    
    const row = data.find(item => item.id === rowId);
    if (row) {
      setEditingRow(rowId);
      // Initialize editData with current row values
      setEditData({ ...row });
    }
  }, [data, editingRow, editPermissionKey, userData]);

  // Handle field change - PRESERVE previous edits
  const handleFieldChange = useCallback((fieldKey, value, column) => {
    setEditData(prevData => {
      let processedValue = value;
      
      // Handle date/time fields specially
      if (column.type === 'datetime') {
        processedValue = parseInputDate(value);
      } else if (column.type === 'date') {
        processedValue = parseInputDateOnly(value);
      }
      
      return {
        ...prevData,  // Keep all previous edits
        [fieldKey]: processedValue
      };
    });
  }, []);

  // Handle save
  const handleSave = useCallback(async (rowId) => {
    if (!onSave) return;
    
    setSavingRow(rowId);
    try {
      await onSave(rowId, editData);
      setEditingRow(null);
      setEditData({});
    } catch (error) {
      console.error('Save failed:', error);
      // Don't reset edit mode on error, let user fix and retry
    } finally {
      setSavingRow(null);
    }
  }, [onSave, editData]);

  // Handle cancel
  const handleCancel = useCallback(() => {
    setEditingRow(null);
    setEditData({});
  }, []);

  // Handle close viewer
  const handleCloseViewer = useCallback(() => {
    setViewerState({ open: false, url: '', mime: '', title: '' });
  }, []);

  // Render cell content
  const renderCell = useCallback((item, column) => {
    const fieldKey = column.key || column.id;
    const isEditing = editingRow === item.id;
    const isReadOnly = column.readOnly === true;

    if (isEditing) {
      // Render input field for editing (disabled if read-only)
      const disabledClass = isReadOnly ? 'bg-gray-100 cursor-not-allowed' : '';
      const commonInputProps = {
        disabled: isReadOnly,
        className: `w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 ${disabledClass}`
      };
      
      // Create onChange handlers for this field
      const handleDateTimeChange = function(e) {
        if (!isReadOnly) {
          handleFieldChange(fieldKey, e.target.value, column);
        }
      };
      
      const handleDateChange = function(e) {
        if (!isReadOnly) {
          handleFieldChange(fieldKey, e.target.value, column);
        }
      };
      
      const handleTextNumberChange = function(e) {
        if (!isReadOnly) {
          handleFieldChange(fieldKey, e.target.value, column);
        }
      };
      
      const handleSelectChange = function(e) {
        if (!isReadOnly) {
          handleFieldChange(fieldKey, e.target.value, column);
        }
      };
      
      const handleBooleanChange = function(e) {
        if (!isReadOnly) {
          const value = e.target.value === 'true';
          handleFieldChange(fieldKey, value, column);
        }
      };
      
      const handleDefaultChange = function(e) {
        if (!isReadOnly) {
          handleFieldChange(fieldKey, e.target.value, column);
        }
      };
      
      switch (column.type) {
        case 'datetime':
          return (
            <TextField
              type="datetime-local"
              value={formatDateForInput(editData[fieldKey])}
              onChange={handleDateTimeChange}
              disabled={isReadOnly}
              className={commonInputProps.className}
              step="1" // Allow seconds
            />
          );
        case 'date':
          return (
            <TextField
              type="date"
              value={formatDateOnlyForInput(editData[fieldKey])}
              onChange={handleDateChange}
              disabled={isReadOnly}
              className={commonInputProps.className}
            />
          );
        case 'text':
          return (
            <TextField
              type="text"
              value={editData[fieldKey] || ''}
              onChange={handleTextNumberChange}
              disabled={isReadOnly}
              className={commonInputProps.className}
            />
          );
        case 'number':
          return (
            <TextField
              type="number"
              value={editData[fieldKey] ?? ''}
              onChange={handleTextNumberChange}
              disabled={isReadOnly}
              className={commonInputProps.className}
              numberMode="int"
              allowNegative
            />
          );
        case 'select':
          return (
            <select
              value={editData[fieldKey] || ''}
              onChange={handleSelectChange}
              {...commonInputProps}
            >
              {column.options?.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          );
        case 'boolean':
          return (
            <select
              value={editData[fieldKey] === true ? 'true' : 'false'}
              onChange={handleBooleanChange}
              {...commonInputProps}
            >
              <option value="true">Yes</option>
              <option value="false">No</option>
            </select>
          );
        default:
          return (
            <TextField
              type="text"
              value={editData[fieldKey] || ''}
              onChange={handleDefaultChange}
              disabled={isReadOnly}
              className={commonInputProps.className}
            />
          );
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

    const handleCellClick = () => {
      if (!isReadOnly && !isEditing) {
        handleRowEdit(item.id);
      }
    };

    return (
      <span 
        className={!isReadOnly && !isEditing ? "cursor-pointer hover:bg-gray-100 px-2 py-1 rounded" : ""}
        onClick={!isReadOnly && !isEditing ? handleCellClick : undefined}
      >
        {displayValue}
      </span>
    );
  }, [editingRow, editData, handleFieldChange, handleRowEdit]);

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
            const isEditing = editingRow === item.id;
            const isSaving = savingRow === item.id;
            
            const handleRowClick = () => {
              handleRowEdit(item.id);
            };

            const handleSaveClick = () => {
              handleSave(item.id);
            };
            
            return (
              <tr key={item.id} className={isEditing ? "bg-blue-50" : "hover:bg-gray-50" } onClick={handleRowClick}>
                {columns?.map((column, colIndex) => (
                  <td
                    key={column.key || column.id || colIndex}
                    className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 border-b border-gray-200"
                 >
                    {renderCell(item, column)}
                  </td>
                ))}
                
                {/* Actions Column */}
                {(isEditing || actions?.length > 0) && (<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 border-b border-gray-200">
                  <div className="flex items-center space-x-2">
                    {isEditing ? (
                      <>
                        <button
                          onClick={handleSaveClick}
                          disabled={isSaving}
                          className="inline-flex items-center px-2 py-1 border border-transparent text-xs font-medium rounded text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                        >
                          <Save className="w-3 h-3 mr-1" />
                          {isSaving ? 'Saving...' : 'Save'}
                        </button>
                        <button
                          onClick={handleCancel}
                          className="inline-flex items-center px-2 py-1 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                        >
                          <X className="w-3 h-3 mr-1" />
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>                        
                        {/* Custom actions */}
                        {actions.length > 0 && (actions.map((action, actionIndex) => {
                          // Handle edit action type - triggers edit mode
                          const handleActionClick = (e) => {
                            e.stopPropagation();
                            if (action.type === 'edit' || action.actionType === 'edit') {
                              handleRowEdit(item.id);
                            } else {
                              action.onClick(item.id, item);
                            }
                          };
                          
                          return (
                            <button
                              key={actionIndex}
                              onClick={handleActionClick}
                              className={`inline-flex items-center px-2 py-1 border text-xs font-medium rounded ${
                                action.type === 'danger' 
                                  ? 'border-red-300 text-red-700 bg-white hover:bg-red-50 focus:ring-2 focus:ring-red-500' 
                                  : action.type === 'primary' || action.type === 'edit' || action.actionType === 'edit'
                                  ? 'border-blue-300 text-blue-700 bg-white hover:bg-blue-50 focus:ring-2 focus:ring-blue-500'
                                  : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50 focus:ring-2 focus:ring-offset-2 focus:ring-gray-500'
                              }`}
                            >
                              {action.icon && <span className="mr-1">{action.icon}</span>}
                              {action.label}
                            </button>
                          );
                        }))}
                      </>
                    )}
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
    readOnly: PropTypes.bool,
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
  onSave: PropTypes.func,
  emptyMessage: PropTypes.string,
  loadingMessage: PropTypes.string,
  editPermissionKey: PropTypes.string
};

export { MasterTable };

