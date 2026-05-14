import { useState, useEffect, useCallback } from "react";
import { ChevronDown } from "lucide-react";
import PropTypes from "prop-types";
import { useLocation, useNavigate } from "react-router-dom";
import { convertToISOString } from "@utils/dateTimeUtils";

const PeriodSelector = ({ onPeriodChange, basePath = "" }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const today = convertToISOString(new Date()).split("T")[0];

  const queryParams = new URLSearchParams(location.search);
  const [isPeriodOpen, setIsPeriodOpen] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState(queryParams.get("selectedPeriod") || "Custom");
  const [startDate, setStartDate] = useState(queryParams.get("startDate") || today);
  const [endDate, setEndDate] = useState(queryParams.get("endDate") || today);

  const timePeriods = ["1 day", "1 week", "1 month", "3 months", "Custom", "Single Date"];

  // Update URL and notify parent when period changes
  const updateUrl = useCallback(() => {
    const currentQuery = new URLSearchParams(location.search);
    const currentPeriod = currentQuery.get("selectedPeriod");
    const currentStartDate = currentQuery.get("startDate");
    const currentEndDate = currentQuery.get("endDate");

    // Skip if no changes
    if (
      currentPeriod === selectedPeriod &&
      currentStartDate === startDate &&
      currentEndDate === endDate
    ) {
      return;
    }

    const params = new URLSearchParams(location.search);
    let query = "";

    const now = new Date();
    if (selectedPeriod === "Custom") {
      params.set("selectedPeriod", selectedPeriod);
      params.set("startDate", startDate);
      params.set("endDate", endDate);
    } else if (selectedPeriod === "Single Date") {
      params.set("selectedPeriod", selectedPeriod);
      params.set("startDate", startDate);
      params.set("endDate", startDate);
    } else if (selectedPeriod === "1 day") {
      const todayString = convertToISOString(now).split("T")[0];
      params.set("selectedPeriod", selectedPeriod);
      params.set("startDate", todayString);
      params.set("endDate", todayString);
    } else if (selectedPeriod === "1 week") {
      const endDateStr = convertToISOString(now).split("T")[0];
      const oneWeekAgo = new Date(now.getTime());
      oneWeekAgo.setDate(now.getDate() - 7);
      const startDateStr = convertToISOString(oneWeekAgo).split("T")[0];
      params.set("selectedPeriod", selectedPeriod);
      params.set("startDate", startDateStr);
      params.set("endDate", endDateStr);
    } else if (selectedPeriod === "1 month") {
      const endDateStr = convertToISOString(now).split("T")[0];
      const oneMonthAgo = new Date(now.getTime());
      oneMonthAgo.setMonth(now.getMonth() - 1);
      const startDateStr = convertToISOString(oneMonthAgo).split("T")[0];
      params.set("selectedPeriod", selectedPeriod);
      params.set("startDate", startDateStr);
      params.set("endDate", endDateStr);
    } else if (selectedPeriod === "3 months") {
      const endDateStr = convertToISOString(now).split("T")[0];
      const threeMonthsAgo = new Date(now.getTime());
      threeMonthsAgo.setMonth(now.getMonth() - 3);
      const startDateStr = convertToISOString(threeMonthsAgo).split("T")[0];
      params.set("selectedPeriod", selectedPeriod);
      params.set("startDate", startDateStr);
      params.set("endDate", endDateStr);
    }

    query = params.toString();
    navigate(`${basePath}?${query}`, { replace: true });
    onPeriodChange();
  }, [selectedPeriod, startDate, endDate, navigate, basePath, location.search, onPeriodChange]);

  // Debounce URL updates to prevent rapid changes
  const debouncedUpdateUrl = useCallback(debounce(updateUrl, 300), [updateUrl]);

  useEffect(() => {
    debouncedUpdateUrl();
  }, [selectedPeriod, startDate, endDate, debouncedUpdateUrl]);

  const handleTogglePeriodOpen = useCallback(() => {
    setIsPeriodOpen(!isPeriodOpen);
  }, [isPeriodOpen]);

  const handlePeriodSelect = useCallback((period) => {
    setSelectedPeriod(period);
    setIsPeriodOpen(false);
  }, []);

  const handleStartDateChange = useCallback((e) => {
    setStartDate(e.target.value);
  }, []);

  const handleEndDateChange = useCallback((e) => {
    setEndDate(e.target.value);
  }, []);

  return (
    <div className="relative z-50">
      <button
        onClick={handleTogglePeriodOpen}
        className="flex items-center justify-between bg-white border border-gray-300 text-gray-800 py-2 px-4 rounded-md w-full cursor-pointer shadow-sm"
      >
        {selectedPeriod}
        <ChevronDown className={`transition-transform ${isPeriodOpen ? "rotate-180" : ""}`} />
      </button>

      {isPeriodOpen && (
        <div className="absolute mt-2 bg-white border border-gray-200 rounded-md shadow-md w-full z-50">
          {timePeriods.map((period, index) => (
            <div
              key={index}
              className="px-4 py-2 hover:bg-gray-100 cursor-pointer text-gray-800"
              onClick={() => handlePeriodSelect(period)}
            >
              {period}
            </div>
          ))}
        </div>
      )}

      <div className="flex justify-center gap-4 mt-4">
        {selectedPeriod === "Custom" && (
          <>
            <input
              type="date"
              value={startDate}
              onChange={handleStartDateChange}
              className="bg-white border border-gray-300 text-gray-800 py-2 px-4 rounded-md cursor-pointer shadow-sm"
            />
            <input
              type="date"
              value={endDate}
              onChange={handleEndDateChange}
              className="bg-white border border-gray-300 text-gray-800 py-2 px-4 rounded-md cursor-pointer shadow-sm"
            />
          </>
        )}

        {selectedPeriod === "Single Date" && (
          <input
            type="date"
            value={startDate}
            onChange={handleStartDateChange}
            className="bg-white border border-gray-300 text-gray-800 py-2 px-4 rounded-md cursor-pointer shadow-sm"
          />
        )}
      </div>
    </div>
  );
};

// Debounce utility
const debounce = (func, wait) => {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

PeriodSelector.propTypes = {
  onPeriodChange: PropTypes.func.isRequired,
  basePath: PropTypes.string,
};

export { PeriodSelector };