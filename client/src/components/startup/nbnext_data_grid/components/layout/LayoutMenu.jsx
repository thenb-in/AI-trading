/**
 * Layout Menu component for saving, loading, and managing layouts
 */

import { useState, useEffect, useCallback } from "react";
import PropTypes from "prop-types";
import { ApiService } from "../../../../../services/startup/ApiService.js";
import { buildColumnConfig } from "../../utils/helpers.js";
import { LayoutList } from "./LayoutList.jsx";
import { ErrorDisplay } from "./ErrorDisplay.jsx";
import { SaveLayoutDialog } from "./SaveLayoutDialog.jsx";
import { LayoutActions } from "./LayoutActions.jsx";

function LayoutMenu({
  documentName,
  normalizedColumns,
  columnVisibility,
  frozenState,
  onLayoutLoad,
  onClose,
}) {
  const [layouts, setLayouts] = useState({ private: [], public: [] });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [newLayoutName, setNewLayoutName] = useState("");
  const [newLayoutType, setNewLayoutType] = useState("private");
  const [selectedLayout, setSelectedLayout] = useState(null);

  const loadLayouts = useCallback(async () => {
    if (!documentName) return;
    try {
      setLoading(true);
      setError(null);
      const response = await ApiService.getLayoutsByDocument(documentName);
      const newLayouts = response.data.data;
      setLayouts(newLayouts);

      const allLayouts = [...newLayouts.private, ...newLayouts.public];

      // Preserve selected layout after reload (only if it was already set)
      // This is useful when refreshing after save/delete/setDefault operations
      if (selectedLayout) {
        const found = allLayouts.find(l => l.id === selectedLayout.id);
        if (found) {
          setSelectedLayout(found);
        } else {
          // Layout was deleted, clear selection
          setSelectedLayout(null);
        }
      } else {
        // On initial load or when no selection exists, automatically select the default layout
        const defaultLayout = allLayouts.find(layout => layout.is_default === true);
        if (defaultLayout) {
          setSelectedLayout(defaultLayout);
        }
      }
    } catch (err) {
      setError(err.message || "Failed to load layouts");
    } finally {
      setLoading(false);
    }
  }, [documentName, selectedLayout]);

  useEffect(() => {
    if (documentName) {
      loadLayouts();
    }
  }, [documentName, loadLayouts]);

  const handleSaveLayout = async () => {
    if (!newLayoutName.trim()) {
      setError("Layout name is required");
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const columnConfig = buildColumnConfig(normalizedColumns, columnVisibility, frozenState);
      const layoutData = {
        document_name: documentName,
        layout_name: newLayoutName.trim(),
        type: newLayoutType,
        column_config: columnConfig,
      };

      // If a layout is selected, update it instead of creating new
      if (selectedLayout) {
        layoutData.id = selectedLayout.id;
      }

      const response = await ApiService.createOrUpdateLayout(layoutData);
      await loadLayouts();

      // Keep the layout selected after update
      if (selectedLayout) {
        // The response contains the updated layout
        const updatedLayout = response.data.data;
        if (updatedLayout) {
          setSelectedLayout(updatedLayout);
        }
      } else {
        // If creating new, set it as selected
        const newLayout = response.data.data;
        if (newLayout) {
          setSelectedLayout(newLayout);
        }
      }

      setSaveDialogOpen(false);
      setNewLayoutName("");
      setNewLayoutType("private");
    } catch (err) {
      setError(err.message || "Failed to save layout");
    } finally {
      setSaving(false);
    }
  };

  const handleLoadLayout = async (layout) => {
    try {
      setError(null);
      // Set this layout as selected
      setSelectedLayout(layout);
      if (onLayoutLoad) {
        onLayoutLoad(layout.column_config, layout);
      }
      onClose();
    } catch (err) {
      setError(err.message || "Failed to load layout");
    }
  };

  const handleDeleteLayout = async (layoutId) => {
    if (!window.confirm("Are you sure you want to delete this layout?")) {
      return;
    }

    try {
      setError(null);
      await ApiService.deleteLayout(layoutId);
      // Clear selection if deleted layout was selected
      if (selectedLayout?.id === layoutId) {
        setSelectedLayout(null);
      }
      await loadLayouts();
    } catch (err) {
      setError(err.message || "Failed to delete layout");
    }
  };

  const handleSetDefault = async (layout, isDefault) => {
    try {
      setError(null);
      if (isDefault) {
        await ApiService.setDefaultLayout(layout.id);
      } else {
        await ApiService.unsetDefaultLayout(documentName);
      }
      // Refresh layouts to update is_default flags
      await loadLayouts();
    } catch (err) {
      setError(err.message || "Failed to set default layout");
    }
  };

  const handleOpenSaveDialog = () => {
    if (selectedLayout) {
      setNewLayoutName(selectedLayout.layout_name);
      setNewLayoutType(selectedLayout.type);
    } else {
      setNewLayoutName("");
      setNewLayoutType("private");
    }
    setSaveDialogOpen(true);
  };

  const handleCancelSave = () => {
    setSaveDialogOpen(false);
    setNewLayoutName("");
    setError(null);
  };

  const handleClearSelection = () => {
    setSelectedLayout(null);
    setNewLayoutName("");
    setNewLayoutType("private");
  };

  return (
    <div className="absolute top-11 right-3 z-[100000] bg-white border border-gray-200 shadow-lg rounded-lg p-3 max-h-[280px] overflow-auto min-w-[220px]">
      <div className="mb-3 font-semibold text-[13px]">
        Layout Manager
      </div>

      <ErrorDisplay error={error} />

      {loading ? (
        <div className="text-center py-5 text-xs text-gray-500">
          Loading layouts...
        </div>
      ) : (
        <div className="max-h-[300px] overflow-y-auto">
          <LayoutList
            layoutList={layouts.private}
            title="Private Layouts"
            selectedLayoutId={selectedLayout?.id}
            onLoad={handleLoadLayout}
            onDelete={handleDeleteLayout}
            onSetDefault={handleSetDefault}
          />
          <div className="h-px bg-gray-200 my-3" />
          <LayoutList
            layoutList={layouts.public}
            title="Public Layouts"
            selectedLayoutId={selectedLayout?.id}
            onLoad={handleLoadLayout}
            onDelete={handleDeleteLayout}
            onSetDefault={handleSetDefault}
          />
        </div>
      )}

      {saveDialogOpen ? (
        <SaveLayoutDialog
          selectedLayout={selectedLayout}
          newLayoutName={newLayoutName}
          newLayoutType={newLayoutType}
          saving={saving}
          onNameChange={setNewLayoutName}
          onTypeChange={setNewLayoutType}
          onSave={handleSaveLayout}
          onCancel={handleCancelSave}
        />
      ) : (
        <LayoutActions
          selectedLayout={selectedLayout}
          onOpenSaveDialog={handleOpenSaveDialog}
          onClearSelection={handleClearSelection}
        />
      )}

      <div className="mt-3">
        <button
          type="button"
          onClick={onClose}
          className="py-1.5 px-2.5 rounded-md border border-gray-200 bg-white cursor-pointer w-full text-xs hover:bg-gray-50"
        >
          Close
        </button>
      </div>
    </div>
  );
}

LayoutMenu.propTypes = {
  documentName: PropTypes.string.isRequired,
  normalizedColumns: PropTypes.array.isRequired,
  columnVisibility: PropTypes.object.isRequired,
  frozenState: PropTypes.object.isRequired,
  onLayoutLoad: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
};

export { LayoutMenu };

