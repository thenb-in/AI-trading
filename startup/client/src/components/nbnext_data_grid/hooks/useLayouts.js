import { useCallback, useEffect, useRef, useState } from "react";
import { ApiService } from "@services/ApiService.js";

// Fetches the layout list for a documentName and, on first load, applies the
// user's default layout via `onApplyDefault(columnConfig, layout)` if one is
// set. One hook = one fetch (replaces the previous split between useLayouts
// and useDefaultLayoutLoader, which both hit `getLayoutsByDocument`).
const useLayouts = (documentName, onApplyDefault) => {
  const [layouts, setLayouts] = useState({ private: [], public: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // One-shot guard per documentName so default-layout application doesn't
  // re-fire on refetch (save/delete/setDefault triggers refetch and we don't
  // want to wipe the user's L3 each time).
  const defaultAppliedRef = useRef({});
  const onApplyDefaultRef = useRef(onApplyDefault);
  useEffect(() => {
    onApplyDefaultRef.current = onApplyDefault;
  }, [onApplyDefault]);

  const refetch = useCallback(async () => {
    if (!documentName) {
      setLayouts({ private: [], public: [] });
      return null;
    }
    try {
      setLoading(true);
      setError(null);
      const response = await ApiService.getLayoutsByDocument(documentName);
      const data = response.data.data;
      setLayouts(data);
      return data;
    } catch (err) {
      setError(err.message || "Failed to load layouts");
      return null;
    } finally {
      setLoading(false);
    }
  }, [documentName]);

  // Initial fetch + default-layout apply. Refetches (from save/delete/etc.)
  // skip the default-apply branch via the per-documentName guard.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const data = await refetch();
      if (cancelled || !data) return;
      if (defaultAppliedRef.current[documentName]) return;
      defaultAppliedRef.current[documentName] = true;
      const all = [...(data.private || []), ...(data.public || [])];
      const def = all.find((l) => l.is_default === true);
      if (def && def.column_config && typeof onApplyDefaultRef.current === "function") {
        onApplyDefaultRef.current(def.column_config, def);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [documentName, refetch]);

  return { layouts, loading, error, refetch };
};

export { useLayouts };
