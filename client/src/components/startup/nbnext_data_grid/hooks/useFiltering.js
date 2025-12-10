import { useState, useCallback } from "react";

const useFiltering = () => {
  const [filterModel, setFilterModel] = useState({});

  const handleFilterChange = useCallback((field, value) => {
    setFilterModel((prev) => {
      const newModel = { ...prev };
      if (value === "" || value == null) {
        delete newModel[field];
      } else {
        newModel[field] = value;
      }
      return newModel;
    });
  }, []);

  const clearAllFilters = useCallback(() => {
    setFilterModel({});
  }, []);

  return {
    filterModel,
    handleFilterChange,
    clearAllFilters,
  };
};

export { useFiltering };

