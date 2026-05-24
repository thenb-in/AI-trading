import { useCallback, useEffect, useState } from "react";
import { ApiService } from "@services/ApiService.js";

// Centralises the layout list for a given documentName so multiple consumers
// (Toolbar's active-layout indicator, LayoutMenu) share one fetch — and so
// mutations from one place stay visible to the other via `refetch`.
const useLayouts = (documentName) => {
  const [layouts, setLayouts] = useState({ private: [], public: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const refetch = useCallback(async () => {
    if (!documentName) {
      setLayouts({ private: [], public: [] });
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const response = await ApiService.getLayoutsByDocument(documentName);
      setLayouts(response.data.data);
    } catch (err) {
      setError(err.message || "Failed to load layouts");
    } finally {
      setLoading(false);
    }
  }, [documentName]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { layouts, loading, error, refetch };
};

export { useLayouts };
