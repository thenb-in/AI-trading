import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import PropTypes from 'prop-types';
import { dataAccessApi } from '@app/services/api';

const LEVELS = [
  { value: 'company', label: 'Company Level' },
  { value: 'department', label: 'Department Level' },
  { value: 'employee', label: 'Employee Level' }
];

function DataAccessSelector({ userId, initialAccess, onSaved, departments: providedDepartments, employees: providedEmployees }) {
  const [currentAccess, setCurrentAccess] = useState({
    level: 'company',
    scope: { departmentIds: [], employeeIds: [] }
  });
  const [savedAccess, setSavedAccess] = useState({
    level: 'company',
    scope: { departmentIds: [], employeeIds: [] }
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [collapsed, setCollapsed] = useState(true);
  const [deptQuery, setDeptQuery] = useState('');
  const [empQuery, setEmpQuery] = useState('');
  const triggerRef = useRef(null);
  const dropdownRef = useRef(null);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 });
  const [isPositioned, setIsPositioned] = useState(false);

  const showDept = currentAccess.level === 'department';
  const showEmp = currentAccess.level === 'employee';

  const departmentOptions = useMemo(() => (
    (providedDepartments || []).map(d => ({ value: d.id, label: d.dept_name }))
  ), [providedDepartments]);

  const employeeOptions = useMemo(() => (
    (providedEmployees || []).map(e => ({ value: e.id, label: `${e.first_name || ''} ${e.last_name || ''}`.trim() || e.emp_code }))
  ), [providedEmployees]);

  const filteredDepartmentOptions = useMemo(() => {
    const q = deptQuery.trim().toLowerCase();
    if (!q) return departmentOptions;
    return departmentOptions.filter(opt => opt.label.toLowerCase().includes(q));
  }, [departmentOptions, deptQuery]);

  const filteredEmployeeOptions = useMemo(() => {
    const q = empQuery.trim().toLowerCase();
    if (!q) return employeeOptions;
    return employeeOptions.filter(opt => opt.label.toLowerCase().includes(q));
  }, [employeeOptions, empQuery]);

  // Initialize from server-provided access 
  useEffect(() => {
    const incoming = initialAccess || {};
    const nextLevel = incoming.level || 'company';
    const deptIds = incoming.scope?.departmentIds || [];
    const empIds = incoming.scope?.employeeIds || [];
    const next = { level: nextLevel, scope: { departmentIds: deptIds, employeeIds: empIds } };
    setCurrentAccess(next);
    setSavedAccess(next);
  }, [initialAccess]);

  // Options are provided by the parent (fetched once at page level)

  const arraysEqual = (a, b) => {
    if (a.length !== b.length) return false;
    const as = [...a].sort();
    const bs = [...b].sort();
    for (let i = 0; i < as.length; i += 1) {
      if (String(as[i]) !== String(bs[i])) return false;
    }
    return true;
  };

  const hasChanges = useMemo(() => (
    currentAccess.level !== savedAccess.level ||
    !arraysEqual(currentAccess.scope.departmentIds, savedAccess.scope.departmentIds) ||
    !arraysEqual(currentAccess.scope.employeeIds, savedAccess.scope.employeeIds)
  ), [currentAccess, savedAccess]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    setError('');
    try {
      await dataAccessApi.setUserDataAccess({
        userId,
        level: currentAccess.level,
        scope: { departmentIds: currentAccess.scope.departmentIds, employeeIds: currentAccess.scope.employeeIds }
      });
      setSavedAccess(currentAccess);
      if (typeof onSaved === 'function') {
        onSaved({ level: currentAccess.level, scope: { departmentIds: currentAccess.scope.departmentIds, employeeIds: currentAccess.scope.employeeIds } });
      }
      setCollapsed(true);
    } catch (e) {
      setError(e?.message || 'Failed to save data access');
    } finally {
      setSaving(false);
    }
  }, [userId, currentAccess, onSaved]);

  const handleCancel = useCallback(() => {
    setCurrentAccess(savedAccess);
    setError('');
    setCollapsed(true);
  }, [savedAccess]);

  const onLevelChange = (e) => {
    const newLevel = e.target.value;
    setCurrentAccess((prev) => {
      if (newLevel === 'company') {
        return { level: newLevel, scope: { departmentIds: [], employeeIds: [] } };
      }
      if (newLevel === 'department') {
        return { level: newLevel, scope: { departmentIds: prev.scope.departmentIds, employeeIds: [] } };
      }
      // employee level
      return { level: newLevel, scope: { departmentIds: [], employeeIds: prev.scope.employeeIds } };
    });
  };

  const toggleDepartment = useCallback((id) => {
    setCurrentAccess((prev) => {
      const prevIds = prev.scope.departmentIds;
      const nextIds = prevIds.includes(id) ? prevIds.filter(v => v !== id) : [...prevIds, id];
      return { level: prev.level, scope: { ...prev.scope, departmentIds: nextIds } };
    });
  }, []);

  const toggleEmployee = useCallback((id) => {
    setCurrentAccess((prev) => {
      const prevIds = prev.scope.employeeIds;
      const nextIds = prevIds.includes(id) ? prevIds.filter(v => v !== id) : [...prevIds, id];
      return { level: prev.level, scope: { ...prev.scope, employeeIds: nextIds } };
    });
  }, []);

  const summaryText = useMemo(() => {
    if (savedAccess.level === 'company') return 'Company access';
    if (savedAccess.level === 'department') {
      const n = savedAccess.scope.departmentIds.length;
      return n === 1 ? '1 department' : `${n} departments`;
    }
    if (savedAccess.level === 'employee') {
      const n = savedAccess.scope.employeeIds.length;
      return n === 1 ? '1 employee' : `${n} employees`;
    }
    return 'Company access';
  }, [savedAccess]);

  // Position dropdown relative to trigger and close on outside click
  useEffect(() => {
    if (!collapsed) {
      const positionDropdown = () => {
        const triggerEl = triggerRef.current;
        if (!triggerEl) return;
        const rect = triggerEl.getBoundingClientRect();
        const gap = 4;
        const dropdownEl = dropdownRef.current;
        const measuredWidth = dropdownEl?.offsetWidth || 320; // fallback for w-80
        const measuredHeight = dropdownEl?.offsetHeight || 320; // conservative fallback

        // Horizontal positioning within viewport (fixed coordinates, no scroll offsets)
        const viewportPadding = 8;
        const viewportRight = window.innerWidth - viewportPadding;
        let left = rect.left;
        if (left + measuredWidth > viewportRight) {
          left = Math.max(viewportPadding, viewportRight - measuredWidth);
        }
        // Decide whether to open below or above based on available space
        const spaceBelow = window.innerHeight - rect.bottom;
        const spaceAbove = rect.top;
        let top;
        if (spaceBelow >= measuredHeight + gap || spaceBelow >= spaceAbove) {
          top = rect.bottom + gap; // open below
        } else {
          top = rect.top - measuredHeight - gap; // open above
        }

        setDropdownPos({ top, left });
      };

      const handleClick = (e) => {
        const inTrigger = triggerRef.current && triggerRef.current.contains(e.target);
        const inDropdown = dropdownRef.current && dropdownRef.current.contains(e.target);
        if (!inTrigger && !inDropdown) {
          setCollapsed(true);
        }
      };
      // Initial position and re-measure on next frame to account for dynamic height
      positionDropdown();
      requestAnimationFrame(() => {
        positionDropdown();
        setIsPositioned(true);
      });
      window.addEventListener('scroll', positionDropdown, true);
      window.addEventListener('resize', positionDropdown);
      document.addEventListener('mousedown', handleClick);
      return () => {
        window.removeEventListener('scroll', positionDropdown, true);
        window.removeEventListener('resize', positionDropdown);
        document.removeEventListener('mousedown', handleClick);
      };
    }
    return undefined;
  }, [collapsed]);

  const handleTriggerClick = useCallback((e) => {
    e.stopPropagation();
    setIsPositioned(false);
    setCollapsed(false);
  }, []);

  const handleDropdownClick = useCallback((e) => {
    e.stopPropagation();
  }, []);

  const handleDeptQueryChange = useCallback((e) => {
    setDeptQuery(e.target.value);
  }, []);

  const handleEmpQueryChange = useCallback((e) => {
    setEmpQuery(e.target.value);
  }, []);

  const createToggleDepartmentHandler = useCallback((id) => {
    return () => toggleDepartment(id);
  }, [toggleDepartment]);

  const createToggleEmployeeHandler = useCallback((id) => {
    return () => toggleEmployee(id);
  }, [toggleEmployee]);

  const createDepartmentKeyDownHandler = useCallback((id) => {
    return (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggleDepartment(id);
      }
    };
  }, [toggleDepartment]);

  const createEmployeeKeyDownHandler = useCallback((id) => {
    return (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggleEmployee(id);
      }
    };
  }, [toggleEmployee]);

  const handleStopPropagation = useCallback((e) => {
    e.stopPropagation();
  }, []);

  const handleCloseClick = useCallback(() => {
    setCollapsed(true);
  }, []);

  /**
   * Search-box + checkable list used for both the Department and Employee scope pickers.
   * Caller supplies the current `query` text, the filtered `options`, predicate `isChecked`,
   * and the per-option handler factories so the rendered checkbox stays in sync with the
   * underlying scope state.
   */
  const renderScopeList = ({
    query,
    onQueryChange,
    placeholder,
    options,
    isChecked,
    createToggleHandler,
    createKeyDownHandler,
  }) => (
    <div className="flex flex-col gap-1">
      <input
        type="text"
        value={query}
        onChange={onQueryChange}
        placeholder={placeholder}
        className="border border-gray-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        disabled={saving}
      />
      <div className="border border-gray-300 rounded-md overflow-hidden">
        <ul className="max-h-72 overflow-y-auto divide-y divide-gray-100">
          {options.length === 0 && (
            <li className="px-2 py-2 text-sm text-gray-400">No results</li>
          )}
          {options.map((opt) => {
            const checked = isChecked(opt);
            return (
              <li key={opt.value}>
                <button
                  type="button"
                  onClick={createToggleHandler(opt.value)}
                  className="w-full flex items-start gap-2 px-2 py-2 text-left text-sm hover:bg-gray-50"
                  disabled={saving}
                  onKeyDown={createKeyDownHandler(opt.value)}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={createToggleHandler(opt.value)}
                    onClick={handleStopPropagation}
                    className="h-4 w-4"
                    disabled={saving}
                  />
                  <span className="whitespace-normal break-words leading-5">{opt.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );

  return (
    <>
      {/* Level selection */}
      <button
        ref={triggerRef}
        type="button"
        onClick={handleTriggerClick}
        className="text-sm px-2 py-1 rounded-full border border-gray-300 bg-white hover:bg-gray-50 transition-colors min-w-[160px] text-left shadow-sm"
        title="Click to edit data access"
      >
        {summaryText}
      </button>

      {!collapsed && (() => {
        const dropdownStyle = {
          position: 'fixed',
          top: dropdownPos.top,
          left: dropdownPos.left,
          zIndex: 100000,
          visibility: isPositioned ? 'visible' : 'hidden'
        };
        return createPortal(
          <div
            ref={dropdownRef}
            style={dropdownStyle}
            onClick={handleDropdownClick}
          >
          <div className="w-80 max-w-[90vw] bg-white border border-gray-200 rounded-lg shadow-lg p-3">
            <div className="flex flex-col gap-2 min-w-[220px]">
              {/*level option like company dpt , emp */}
            <div className="flex items-center gap-2">
              <select
                value={currentAccess.level}
                onChange={onLevelChange}
                className="border border-gray-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={saving}
              >
                {LEVELS.map(l => (
                  <option key={l.value} value={l.value}>{l.label}</option>
                ))}
              </select>
              {saving && (
                <span className="text-xs text-gray-400">Saving…</span>
              )}
            </div>
            {/* Department selection */}
            {showDept && renderScopeList({
              query: deptQuery,
              onQueryChange: handleDeptQueryChange,
              placeholder: 'Search departments…',
              options: filteredDepartmentOptions,
              isChecked: (opt) => currentAccess.scope.departmentIds.includes(opt.value),
              createToggleHandler: createToggleDepartmentHandler,
              createKeyDownHandler: createDepartmentKeyDownHandler,
            })}
            {/* Employee selection */}
            {showEmp && renderScopeList({
              query: empQuery,
              onQueryChange: handleEmpQueryChange,
              placeholder: 'Search employees…',
              options: filteredEmployeeOptions,
              isChecked: (opt) => currentAccess.scope.employeeIds.includes(opt.value),
              createToggleHandler: createToggleEmployeeHandler,
              createKeyDownHandler: createEmployeeKeyDownHandler,
            })}
            {/* Action buttons and error message */}
            <div className="flex justify-end gap-2 mt-1">
              <button
                type="button"
                className={`px-3 py-1 rounded-md text-sm ${hasChanges ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-200 text-gray-500 cursor-not-allowed'}`}
                onClick={handleSave}
                disabled={!hasChanges || saving}
              >
                Save
              </button>
              {hasChanges && (
                <button
                  type="button"
                  className="px-3 py-1 rounded-md text-sm bg-gray-100 text-gray-700 hover:bg-gray-200"
                  onClick={handleCancel}
                  disabled={saving}
                >
                  Cancel
                </button>
              )}
              {!hasChanges && (
                <button
                  type="button"
                  className="px-3 py-1 rounded-md text-sm bg-gray-100 text-gray-700 hover:bg-gray-200"
                  onClick={handleCloseClick}
                  disabled={saving}
                >
                  Close
                </button>
              )}
            </div>

            {error && (
              <div className="text-xs text-red-600">{error}</div>
            )}
            </div>
          </div>
        </div>,
        document.body
        );
      })()}
    </>
  );
}

DataAccessSelector.propTypes = {
  userId: PropTypes.string.isRequired,
  initialAccess: PropTypes.shape({
    level: PropTypes.oneOf(['company','department','employee']),
    scope: PropTypes.shape({
      departmentIds: PropTypes.arrayOf(PropTypes.oneOfType([PropTypes.number, PropTypes.string])),
      employeeIds: PropTypes.arrayOf(PropTypes.oneOfType([PropTypes.number, PropTypes.string]))
    })
  }),
  onSaved: PropTypes.func,
  departments: PropTypes.array,
  employees: PropTypes.array
};

export { DataAccessSelector };



