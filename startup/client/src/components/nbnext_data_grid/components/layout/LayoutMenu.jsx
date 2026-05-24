/**
 * Layout Menu component for saving, loading, and managing layouts
 */

import { useState, useEffect } from "react";
import PropTypes from "prop-types";
import { ApiService } from "@services/ApiService.js";
import { columnMenuStyle } from "../../utils/styles.js";
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
  columnOrder = [],
  sortModel = [],
  originalColumnVisibility = null,
  originalFrozenState = null,
  layouts,
  layoutsLoading = false,
  layoutsError = null,
  refetchLayouts,
  activeLayout = null,
  onLayoutLoad,
  onClose,
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [newLayoutName, setNewLayoutName] = useState("");
  const [newLayoutType, setNewLayoutType] = useState("private");
  const [selectedLayout, setSelectedLayout] = useState(null);

  // Seed selection from the currently-active layout, or fall back to the
  // user's default. Re-runs when the layouts list refreshes so save/delete
  // operations keep the selection coherent.
  useEffect(() => {
    const allLayouts = [...(layouts.private || []), ...(layouts.public || [])];
    if (selectedLayout) {
      const found = allLayouts.find((l) => l.id === selectedLayout.id);
      if (found) {
        if (found !== selectedLayout) setSelectedLayout(found);
      } else {
        setSelectedLayout(null);
      }
      return;
    }
    if (activeLayout) {
      setSelectedLayout(activeLayout);
      return;
    }
    const defaultLayout = allLayouts.find((l) => l.is_default === true);
    if (defaultLayout) setSelectedLayout(defaultLayout);
  }, [layouts, activeLayout, selectedLayout]);

  const handleSaveLayout = async () => {
    if (!newLayoutName.trim()) {
      setError("Layout name is required");
      return;
    }

    try {
      setSaving(true);
      setError(null);

      // Persist both visible state (for restore) and the user-intent baseline
      // (so the next session can gate backend overlay re-applies correctly).
      // Re-saving an existing layout naturally refreshes both — picking up any
      // baseline changes from manual toggles since the layout was loaded.
      const columnConfig = buildColumnConfig(
        normalizedColumns,
        columnVisibility,
        frozenState,
        columnOrder,
        sortModel,
        originalColumnVisibility,
        originalFrozenState,
      );
      const layoutData = {
        document_name: documentName,
        layout_name: newLayoutName.trim(),
        type: newLayoutType,
        column_config: columnConfig,
      };

      if (selectedLayout) {
        layoutData.id = selectedLayout.id;
      }

      const response = await ApiService.createOrUpdateLayout(layoutData);
      await refetchLayouts();

      const persisted = response.data.data;
      if (persisted) {
        setSelectedLayout(persisted);
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
      if (selectedLayout?.id === layoutId) {
        setSelectedLayout(null);
      }
      await refetchLayouts();
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
      await refetchLayouts();
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

  // Surface either a save-time error or a load-time error from the shared
  // layouts hook — whichever is current. Save errors take precedence since
  // they're the most recent user action.
  const displayedError = error || layoutsError;

  return (
    <div style={columnMenuStyle}>
      <div className="font-semibold text-sm mb-4">
        Layout Manager
      </div>

      <ErrorDisplay error={displayedError} />

      {layoutsLoading ? (
        <div className="text-center text-xs text-gray-600 py-8">
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
          <div className="bg-gray-200 h-px my-4" />
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

      <div className="mt-4">
        <button
          type="button"
          onClick={onClose}
          className="rounded border border-gray-200 bg-white cursor-pointer w-full py-1 px-2"
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
  columnOrder: PropTypes.array,
  sortModel: PropTypes.array,
  originalColumnVisibility: PropTypes.object,
  originalFrozenState: PropTypes.object,
  layouts: PropTypes.shape({
    private: PropTypes.array,
    public: PropTypes.array,
  }).isRequired,
  layoutsLoading: PropTypes.bool,
  layoutsError: PropTypes.string,
  refetchLayouts: PropTypes.func.isRequired,
  activeLayout: PropTypes.object,
  onLayoutLoad: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
};

export { LayoutMenu };
