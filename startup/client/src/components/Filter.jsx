import { useState, useEffect, useRef, useCallback } from "react";
import {
  Filter as FilterIcon,
  Check,
  X,
  Loader2,
  ChevronDown,
} from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { commonFilters } from "@data/reportFilterConfig";
import PropTypes from "prop-types";
import { ApiService } from "../services/ApiService";
import { ChoicesUtil } from "./ChoicesUtil";
import { STORAGE_KEYS } from "../constants";
import { isDebugMode, subscribeToDebugMode, toggleDebugMode } from "../services/debugModeService";
import { format} from 'date-fns';
import { formatDate } from '@utils/dateTimeUtils';
import { DateTypeField } from '@startup/components/base_components/fields/DateTypeField';
import { CheckboxTypeField } from '@startup/components/base_components/fields/CheckboxTypeField';
import { toast } from 'react-toastify';

const Filter = ({
  onFiltersApply,
  additionalFilters = [],
  disabled = false,
  debugFilters = [],
}) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [usersAndRoles, setUsersAndRoles] = useState([]);

  // Use debug mode service instead of local session storage management
  const [showDebugFilters, setShowDebugFilters] = useState(() => isDebugMode());

  // Subscribe to debug mode changes
  useEffect(() => {
    const unsubscribe = subscribeToDebugMode((newValue) => {
      setShowDebugFilters(newValue);
    });

    return unsubscribe;
  }, []);

  const [allFilters, setAllFilters] = useState([
    ...commonFilters.filter(f => !debugFilters.includes(f.name)),
    ...additionalFilters.filter(f => !debugFilters.includes(f.name)),
  ]);

  const getDefaultDateValue = useCallback((dateParam) => {
    const paramValue = searchParams.get(dateParam);
    if (paramValue) return paramValue;
    // Default to yesterday for both start_date and end_date
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return format(yesterday, 'yyyy-MM-dd');
  }, [searchParams]);

  const getInitialFilters = useCallback(() => {
    return allFilters.reduce((acc, config) => {
      const paramValue = searchParams.get(config.name);
      if (paramValue !== null) {
        if (config.type === "checkbox") {
          acc[config.name] = paramValue === "true";
        } else if (config.type === "select" && config.multiselect) {
          const values = paramValue.split(",").filter((val) => val !== "all");
          acc[config.name] = values.length > 0 ? values : "all";
        } else {
          acc[config.name] = paramValue;
        }
      } else if (config.default !== undefined) {
        acc[config.name] = config.default;
      } else if (config.type === "date") {
        acc[config.name] = getDefaultDateValue(config.name);
      } else {
        acc[config.name] = "all";
      }
      return acc;
    }, {});
  }, [searchParams, allFilters, getDefaultDateValue]);

  const [filters, setFilters] = useState(() => getInitialFilters());
  const [/* roles */, setRoles] = useState([]);
  const [/* users */, setUsers] = useState([]);
  const [isApplyingFilters, setIsApplyingFilters] = useState(false);
  const [isLoadingFilters, setIsLoadingFilters] = useState(false);
  const [previousSearchParams, setPreviousSearchParams] = useState(
    searchParams.toString()
  );
  const [isExpanded, setIsExpanded] = useState(true);

  const roleSelectRef = useRef(null);
  const userSelectRef = useRef(null);
  const choicesUtil = useRef(new ChoicesUtil());

  const isDisabled = isApplyingFilters;
  const isBusy = isApplyingFilters || isLoadingFilters;


  useEffect(() => {
    const currentSearchParams = searchParams.toString();
    console.log("Current search params:", currentSearchParams);
    console.log("Previous search params:", previousSearchParams);

    if (currentSearchParams !== previousSearchParams) {
      console.log("Search params changed. Resetting filters...");

      const initialFilters = getInitialFilters();
      console.log("Initial filters:", initialFilters);

      setFilters(initialFilters);
      setPreviousSearchParams(currentSearchParams);

      setTimeout(() => {
        console.log("Setting Choices values...");

        const roleConfig = allFilters.find(
          (config) => config.name === "role"
        );
        console.log("Role config:", roleConfig);

        if (roleConfig && initialFilters.role) {
          console.log(
            "Setting role value in Choices:",
            initialFilters.role
          );
          choicesUtil.current.setValue(
            "role",
            initialFilters.role,
            roleConfig.multiselect
          );
        }

        if (initialFilters.user) {
          console.log("Setting user value in Choices:", initialFilters.user);
          choicesUtil.current.setValue("user", initialFilters.user);
        }

        console.log("Choices values set.");
      }, 0);
    } else {
      console.log("Search params did not change. No action taken.");
    }
  }, [searchParams, previousSearchParams, getInitialFilters, allFilters]);

  useEffect(() => {
    const initializeSelects = (data) => {
      if (
        !choicesUtil.current.hasInstance("role") &&
        roleSelectRef.current
      ) {
        const roleConfig = allFilters.find(
          (config) => config.name === "role"
        );
        choicesUtil.current.initializeRoleChoices(
          roleSelectRef.current,
          data.roles,
          (e) =>
            handleSelectChange(e, "role", roleConfig?.multiselect),
          roleConfig?.multiselect,
          roleConfig?.clearable
        );
      }
      if (
        !choicesUtil.current.hasInstance("user") &&
        userSelectRef.current
      ) {
        choicesUtil.current.initializeUserChoices(
          userSelectRef.current,
          data.users,
          (e) => handleSelectChange(e, "user")
        );
      }
    };

    const fetchUsersAndRoles = async (isActive = true) => {
      setIsLoadingFilters(true);
      try {
        setRoles([]);
        setUsers([]);
        const [usersResponse, rolesResponse] = await Promise.all([
          ApiService.getAllUsers(),
          ApiService.getRoles()
        ]);
        
        const usersData = usersResponse.data?.users || [];
        const rolesData = rolesResponse.data?.data || rolesResponse.data || [];
        
        // Format users for Choices.js: { value: id, label: name }
        const formattedUsers = usersData
          .filter(user => isActive ? user.isActive !== false : true)
          .map(user => ({ value: user.id, label: user.name || user.username }));
        
        // Format roles for Choices.js: { value: id, label: name }
        const formattedRoles = Array.isArray(rolesData)
          ? rolesData.map(role => ({ value: role.id, label: role.name }))
          : [];
        
        const data = {
          users: formattedUsers,
          roles: formattedRoles
        };
        
        setUsersAndRoles(data);
        setUsers(formattedUsers);
        setRoles(formattedRoles);
        initializeSelects(data);
      } catch (error) {
        console.error("Failed to fetch users and roles:", error);
        toast.error("Failed to fetch users and roles");
      } finally {
        setIsLoadingFilters(false);
      }
    };

    const isActive = filters.is_active !== undefined ? filters.is_active : true;
    fetchUsersAndRoles(isActive);
    return () => choicesUtil.current.destroyAllChoices();
  }, [filters.is_active, allFilters]);


  useEffect(() => {
    console.log("🔹 User and Role data changed:", usersAndRoles);

    if (!usersAndRoles || Object.keys(usersAndRoles).length === 0) {
      console.log("No user/role data yet. Exiting useEffect.");
      return;
    }

    const initialFilters = getInitialFilters();
    console.log("Initial filters from URL or defaults:", initialFilters);

    if (roleSelectRef.current) {
      const roleConfig = allFilters.find((config) => config.name === "role");
      console.log(
        "Setting role in Choices:",
        initialFilters.role || "all"
      );
      choicesUtil.current.setValue(
        "role",
        initialFilters.role || "all",
        roleConfig?.multiselect || false
      );
    } else {
      console.log("Role select ref not initialized yet.");
    }

    if (userSelectRef.current) {
      console.log("Setting user in Choices:", initialFilters.user || "all");
      choicesUtil.current.setValue(
        "user",
        initialFilters.user || "all"
      );
    } else {
      console.log("User select ref not initialized yet.");
    }

    console.log("✅ Choices values set for all filters.");
  }, [usersAndRoles, getInitialFilters, allFilters]);

  const handleSelectChange = useCallback((e, name, isMultiSelect = false) => {
    if (isDisabled) return;

    let newValue;

    // Get the Choices.js instance for this dropdown
    const choicesInstance = choicesUtil.current.getInstance(name);

    if (choicesInstance) {
      if (isMultiSelect) {
        // For multiselect, get current values from Choices.js
        const currentValues = choicesInstance.getValue();
        newValue = currentValues.map(item => item.value).filter(val => val);
        if (newValue.length === 0) newValue = 'all';
      } else {
        // For single select, get current value from Choices.js
        const currentValue = choicesInstance.getValue();
        newValue = currentValue?.value || 'all';
      }
    } else {
      // Fallback to event values if Choices.js instance not found
      if (isMultiSelect) {
        newValue = Array.from(e?.target?.selectedOptions || [])
          .map((option) => option.value)
          .filter((val) => val);
      } else {
        newValue = e?.target?.value || e?.detail?.value || 'all';
      }
    }

    console.log(`🔄 Filter change - ${name}:`, newValue, 'Event:', e, 'Choices instance:', !!choicesInstance);
    setFilters((prev) => ({ ...prev, [name]: newValue }));
  }, [isDisabled]);

  // input change for text inputs is currently not used

  const handleDateChange = useCallback((name, value) => {
    if (isDisabled) return;
    setFilters((prev) => ({ ...prev, [name]: value }));
  }, [isDisabled]);

  const handleCheckboxChange = (e) => {
    if (isDisabled) return;
    const { name, checked } = e.target;
    setFilters((prev) => ({ ...prev, [name]: checked }));
  };

  // Quick date selection functions
  const setPreviousMonth = () => {
    if (isDisabled) return;
    const now = new Date();
    const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastDayOfPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    const newFiltersFl = { ...filters };
    if (allFilters.find(f => f.name === 'start_date')) {
      newFiltersFl['start_date'] = formatDate(prevMonth);
    }
    if (allFilters.find(f => f.name === 'end_date')) {
      newFiltersFl['end_date'] = formatDate(lastDayOfPrevMonth);
    }
    setFilters(newFiltersFl);
  };

  const setThisMonth = () => {
    if (isDisabled) return;
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);

    const newFiltersTh = { ...filters };
    if (allFilters.find(f => f.name === 'start_date')) {
      newFiltersTh['start_date'] = formatDate(firstDayOfMonth);
    }
    if (allFilters.find(f => f.name === 'end_date')) {
      newFiltersTh['end_date'] = formatDate(yesterday);
    }
    setFilters(newFiltersTh);
  };

  const setYesterday = () => {
    if (isDisabled) return;
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const newFiltersYe = { ...filters };
    if (allFilters.find(f => f.name === 'start_date')) {
      newFiltersYe['start_date'] = formatDate(yesterday);
    }
    if (allFilters.find(f => f.name === 'end_date')) {
      newFiltersYe['end_date'] = formatDate(yesterday);
    }
    setFilters(newFiltersYe);
  };

  const handleFiltersLabelClick = useCallback((e) => {
    if (e.detail === 3) {
      toggleDebugMode();
    }
  }, []);

  // Check if both start_date and end_date filters exist
  const hasDateFilters = allFilters.some(f => f.name === 'start_date' && f.type === 'date') &&
    allFilters.some(f => f.name === 'end_date' && f.type === 'date');

  const resetFilters = () => {
    if (isDisabled) return;

    const resetValues = allFilters.reduce((acc, config) => {
      if (config.type === "checkbox") {
        acc[config.name] = config.default ?? false;
      } else if (config.type === "date") {
        acc[config.name] = getDefaultDateValue(config.name);
      } else {
        acc[config.name] = config.default ?? "all";
      }
      return acc;
    }, {});

    setFilters(resetValues);

    // Reset Choices.js dropdowns
    choicesUtil.current.resetAllChoices();
    allFilters.forEach(config => {
      if (resetValues[config.name] !== undefined) {
        const isMulti = config.type === "select" && config.multiselect;
        choicesUtil.current.setValue(config.name, resetValues[config.name], isMulti);
      }
    });

    // **Update URL with reset filters**
    const newSearchParams = new URLSearchParams();
    Object.entries(resetValues).forEach(([key, value]) => {
      if (typeof value === "boolean") {
        newSearchParams.set(key, value ? "true" : "false");
      } else if (Array.isArray(value)) {
        // If multiselect array is empty or contains 'all', don't include it in URL
        if (value.length && !(value.length === 1 && value[0] === "all")) {
          newSearchParams.set(key, value.join(","));
        }
      } else {
        newSearchParams.set(key, value);
      }
    });

    setSearchParams(newSearchParams, { replace: true });
  };
  const applyFilters = async () => {
    if (isDisabled) {
      console.log("Filtering is disabled, exiting early");
      return;
    }
    setIsApplyingFilters(true);
    try {
      const appliedFilters = {};
      allFilters.forEach((config) => {
        const value = filters[config.name];
        if (value === undefined || value === null) return;

        // Always include checkbox values, even if false
        if (config.type === "checkbox") {
          appliedFilters[config.name] = value ? "true" : "false";
        } else if (config.type === "select" && config.multiselect) {
          if (Array.isArray(value) && value.length > 0) {
            appliedFilters[config.name] = value.join(",");
          } else if (value !== "all") {
            appliedFilters[config.name] = value;
          }
        } else {
          // Handle other filter types
          appliedFilters[config.name] = value;
        }
      });
      await onFiltersApply?.(appliedFilters);
    } catch (error) {
      console.error("Error applying filters:", error);
    } finally {
      setIsApplyingFilters(false);
    }
  };

  const renderFilterInput = (config) => {
    const inputDisabled = isDisabled;

    switch (config.type) {
      case "date":
        return (
          <DateTypeField
            name={config.name}
            value={filters[config.name] || ''}
            onChange={(name, value) => handleDateChange(name, value)}
            disabled={inputDisabled}
            placeholder={config.placeholder || 'DD/MM/YYYY'}
            maxToday={true}
          />
        );

      case "select":
        return (
          <div
            className={`relative ${inputDisabled ? "pointer-events-none opacity-60" : ""
              }`}
          >
            <select
              ref={
                config.name === "role"
                  ? roleSelectRef
                  : config.name === "user"
                    ? userSelectRef
                    : null
              }
              name={config.name}
              disabled={inputDisabled}
              className={`
                w-full h-9 px-3 pr-8 text-sm border rounded-md appearance-none transition-colors
                focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500
                ${inputDisabled
                  ? "bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed"
                  : "bg-white border-gray-300 text-gray-900 hover:border-gray-400 cursor-pointer"
                }
              `}
              multiple={config.multiselect || false}
            >
              <option value="all">{config.placeholder || "Select"}</option>
            </select>
            <ChevronDown
              size={16}
              className={`absolute right-2.5 top-1/2 transform -translate-y-1/2 pointer-events-none ${inputDisabled ? "text-gray-300" : "text-gray-500"
                }`}
            />
          </div>
        );

      case "checkbox":
        return (
          <label
            className={`inline-flex items-center text-sm cursor-pointer ${inputDisabled
                ? "cursor-not-allowed opacity-60"
                : "hover:text-gray-900"
              }`}
          >
            <CheckboxTypeField
              mode="bare"
              name={config.name}
              checked={filters[config.name] || false}
              onChange={handleCheckboxChange}
              disabled={inputDisabled}
              className={`w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500/20 ${inputDisabled ? "cursor-not-allowed" : "cursor-pointer"
                }`}
            />
            <span className="ml-2 text-gray-700">{config.label}</span>
          </label>
        );

      default:
        return null;
    }
  };

  // Separate filters by is_standard and sort by order
  const standardFilters = allFilters
    .filter(config => config.is_standard === true)
    .sort((a, b) => (a.order || 999) - (b.order || 999));
  const nonStandardFilters = allFilters
    .filter(config => config.is_standard === false)
    .sort((a, b) => (a.order || 999) - (b.order || 999));

  const activeFiltersCount = Object.entries(filters).filter(([/* key */, value]) => {
    if (typeof value === "boolean") return value;
    if (Array.isArray(value)) return value.length > 0;
    return value !== "all" && value !== "";
  }).length;

  //sessionStorage
  useEffect(() => {
    try {
      sessionStorage.setItem(
        STORAGE_KEYS.REPORT_FILTERS_DEBUG,
        showDebugFilters ? "true" : "false"
      );
    } catch {
      console.log("Failed to persist debug filters state");
    }
  }, [showDebugFilters]);

  // keep allFilters in sync with debug toggle and ensure Choices init when debug enabled
  useEffect(() => {
    if (showDebugFilters) {
      const nextFilterConfigs = [
        ...commonFilters,
        ...additionalFilters,
      ];
      setAllFilters(nextFilterConfigs);

      // Ensure defaults for any newly visible filters (e.g., is_debug_mode)
      setFilters((prev) => {
        const merged = { ...prev };
        nextFilterConfigs.forEach((config) => {
          if (!(config.name in merged)) {
            if (config.type === "checkbox") {
              merged[config.name] = config.default ?? false;
            } else if (config.type === "date") {
              merged[config.name] = getDefaultDateValue(config.name);
            } else if (config.type === "select" && config.multiselect) {
              merged[config.name] = Array.isArray(config.default)
                ? config.default
                : "all";
            } else {
              merged[config.name] = config.default ?? "all";
            }
          }
        });

        // Only update state if something actually changed to avoid render loops
        const prevKeys = Object.keys(prev);
        const mergedKeys = Object.keys(merged);
        const keysChanged = prevKeys.length !== mergedKeys.length;
        if (!keysChanged) {
          for (let i = 0; i < mergedKeys.length; i++) {
            const key = mergedKeys[i];
            if (merged[key] !== prev[key]) {
              return merged;
            }
          }
          return prev; // no change
        }
        return merged;
      });

      // Re-initialize Choices for visible selects after DOM renders if needed
      // (Currently no debug-specific select filters)
    } else {
      // Hide debug filters
      setAllFilters([
        ...commonFilters.filter((f) => !debugFilters.includes(f.name)),
        ...additionalFilters.filter((f) => !debugFilters.includes(f.name)),
      ]);
    }
  }, [showDebugFilters, additionalFilters, debugFilters, getDefaultDateValue, handleSelectChange]);

  return (
    <div
      className={`relative bg-gradient-to-br from-white to-blue-50/30 border-2 border-blue-300 rounded-lg shadow-lg mb-4 ${disabled ? "opacity-70" : ""
        }`}
    >
      {/* Loading Overlay */}
      {isBusy && (
        <div className="absolute inset-0 bg-white/90 backdrop-blur-sm rounded-xl z-50 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3 p-6 bg-white rounded-xl shadow-xl border-2 border-blue-200">
            <div className="relative">
              <Loader2 size={32} className="animate-spin text-blue-600" />
              <div className="absolute inset-0 rounded-full border-2 border-blue-100"></div>
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-gray-900 mb-1">{isApplyingFilters ? "Applying Filters" : "Loading Filters"}</p>
              <p className="text-xs text-gray-500">Please wait...</p>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b-2 border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50/50 rounded-t-lg overflow-hidden">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-blue-500 rounded-lg">
            <FilterIcon size={16} className="text-white" />
          </div>
          <div className="flex items-center gap-2">
            <span
              className="text-sm font-bold text-gray-900 tracking-wide"
              onClick={handleFiltersLabelClick}
            >
              FILTERS
            </span>
            {activeFiltersCount > 0 && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-extrabold bg-blue-600 text-white shadow-md border-2 border-blue-700">
                {activeFiltersCount} ACTIVE
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isBusy && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-500 rounded-md text-xs font-bold text-white shadow-sm">
              <Loader2 size={12} className="animate-spin" />
              <span>{isLoadingFilters ? "LOADING..." : "APPLYING..."}</span>
            </div>
          )}

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            disabled={isBusy}
            className="p-2 text-gray-600 hover:text-gray-800 hover:bg-blue-100 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed border border-transparent hover:border-blue-200"
            aria-label={isExpanded ? "Collapse filters" : "Expand filters"}
          >
            <ChevronDown
              size={16}
              className={`transform transition-transform duration-200 ${isExpanded ? "rotate-180" : ""
                }`}
            />
          </button>
        </div>
      </div>

      {/* Content */}
      <div
        className={`transition-all duration-300 ${isExpanded ? "opacity-100 max-h-none" : "opacity-0 max-h-0 overflow-hidden"}`}
      >
        <div className="p-3 sm:p-4 space-y-3 bg-white rounded-b-lg">
          {/* Standard Filters - Above the bar */}
          {standardFilters.length > 0 && (
            <div>
              {/* All Standard Filters */}
              <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8 gap-2.5">
                {standardFilters
                  .filter((config) => !config.hidden)
                  .map((config) => (
                    <div key={config.name} className="space-y-1">
                      <label
                        className={`block text-xs font-bold uppercase tracking-wide truncate ${isDisabled ? "text-gray-400" : "text-gray-800"
                          }`}
                      >
                        {config.label}
                      </label>
                      {renderFilterInput(config)}
                    </div>
                  ))}
              </div>

              {/* Quick Date Selection Buttons - Only show when both start_date and end_date exist */}
              {hasDateFilters && (
                <div className="mt-2 p-2.5 bg-gradient-to-r from-blue-100 to-indigo-100 rounded-md border-2 border-blue-400 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-1 h-4 bg-blue-600 rounded-full"></div>
                      <label className="text-xs font-bold uppercase tracking-wide text-gray-900">Quick Dates</label>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={setPreviousMonth}
                      disabled={isDisabled}
                      className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all duration-200 border-2 shadow-sm ${isDisabled
                          ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
                          : "bg-white text-gray-800 hover:bg-blue-50 hover:border-blue-500 hover:shadow-md border-blue-300 active:scale-95"
                        }`}
                    >
                      Prev Month
                    </button>
                    <button
                      type="button"
                      onClick={setThisMonth}
                      disabled={isDisabled}
                      className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all duration-200 border-2 shadow-sm ${isDisabled
                          ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
                          : "bg-white text-gray-800 hover:bg-blue-50 hover:border-blue-500 hover:shadow-md border-blue-300 active:scale-95"
                        }`}
                    >
                      This Month
                    </button>
                    <button
                      type="button"
                      onClick={setYesterday}
                      disabled={isDisabled}
                      className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all duration-200 border-2 shadow-sm ${isDisabled
                          ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
                          : "bg-white text-gray-800 hover:bg-blue-50 hover:border-blue-500 hover:shadow-md border-blue-300 active:scale-95"
                        }`}
                    >
                      Yesterday
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Non-Standard Filters - Below the bar */}
          {nonStandardFilters.length > 0 && (
            <div className="space-y-2">
              {/* All Non-Standard Filters */}
              <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8 gap-2.5">
                {nonStandardFilters
                  .filter((config) => !config.hidden)
                  .map((config) => (
                    <div key={config.name} className="space-y-1">
                      {renderFilterInput(config)}
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col sm:flex-row justify-end gap-2 pt-3 mt-3 border-t-2 border-blue-200 bg-gradient-to-r from-gray-50 to-blue-50/30 -mx-3 sm:-mx-4 px-3 sm:px-4 pb-3">
            <button
              onClick={resetFilters}
              disabled={disabled}
              className={`
                inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold uppercase tracking-wide rounded-md border-2 transition-all duration-200 w-full sm:w-auto shadow-sm
                ${disabled
                  ? "text-gray-400 bg-gray-50 border-gray-200 cursor-not-allowed"
                  : "text-gray-800 bg-white border-gray-400 hover:bg-red-50 hover:border-red-400 hover:shadow-md active:scale-95"
                }
              `}
            >
              <X size={14} />
              Clear All
            </button>

            <button
              onClick={applyFilters}
              disabled={disabled}
              className={`
                inline-flex items-center justify-center gap-1.5 px-5 py-2 text-xs font-bold uppercase tracking-wide text-white rounded-md transition-all duration-200 w-full sm:w-auto shadow-md
                ${disabled
                  ? "bg-blue-400 cursor-not-allowed shadow-sm"
                  : "bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 hover:shadow-lg active:scale-95"
                }
              `}
            >
              {disabled ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Applying...
                </>
              ) : (
                <>
                  <Check size={14} />
                  Apply Filters
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

Filter.propTypes = {
  onFiltersApply: PropTypes.func,
  additionalFilters: PropTypes.arrayOf(
    PropTypes.shape({
      name: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
      type: PropTypes.oneOf(["date", "select", "checkbox"]).isRequired,
      default: PropTypes.any,
      options: PropTypes.array,
      multiselect: PropTypes.bool,
      clearable: PropTypes.bool,
      placeholder: PropTypes.string,
    })
  ),
  disabled: PropTypes.bool,
  debugFilters: PropTypes.array
};

export { Filter };

