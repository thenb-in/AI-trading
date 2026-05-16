import { useEffect, useRef } from "react";
import { ApiService } from "@services/ApiService";

// Loads the user's default layout for a given documentName and applies it via
// the supplied `applyLayout` callback. Uses a ref so callback identity churn
// doesn't re-trigger the fetch.
const useDefaultLayoutLoader = ({ documentName, columns, normalizedColumns, applyLayout }) => {
  const defaultLayoutAppliedRef = useRef({});
  const applyLayoutRef = useRef(applyLayout);

  useEffect(() => {
    applyLayoutRef.current = applyLayout;
  }, [applyLayout]);

  useEffect(() => {
    if (documentName) {
      Object.keys(defaultLayoutAppliedRef.current).forEach((key) => {
        if (key !== documentName) {
          delete defaultLayoutAppliedRef.current[key];
        }
      });
    }

    const loadDefaultLayout = async () => {
      if (!documentName) return;
      if (defaultLayoutAppliedRef.current[documentName]) return;
      if (!normalizedColumns || normalizedColumns.length === 0) return;
      if (!columns || columns.length === 0) return;

      try {
        const response = await ApiService.getLayoutsByDocument(documentName);
        const layouts = response.data.data;

        const allLayouts = [...(layouts.private || []), ...(layouts.public || [])];
        const defaultLayout = allLayouts.find((layout) => layout.is_default === true);

        if (
          defaultLayout &&
          defaultLayout.column_config &&
          Array.isArray(defaultLayout.column_config)
        ) {
          defaultLayoutAppliedRef.current[documentName] = true;

          // Small delay to ensure state setters are ready
          await new Promise((resolve) => setTimeout(resolve, 50));

          applyLayoutRef.current(defaultLayout.column_config);
        } else {
          defaultLayoutAppliedRef.current[documentName] = true;
        }
      } catch (error) {
        // Silently fail - default layout is optional. Mark as checked to prevent retries.
        void error;
        defaultLayoutAppliedRef.current[documentName] = true;
      }
    };

    loadDefaultLayout();
  }, [documentName, columns, normalizedColumns]);
};

export { useDefaultLayoutLoader };
