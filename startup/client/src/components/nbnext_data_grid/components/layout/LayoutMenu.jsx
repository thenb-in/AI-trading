// Layout manager dialog: list saved layouts, load/save/delete, mark default.
//
// Save flow (new 3-layer model):
//   1. Caller (NbNextDataGrid) provides `buildSavePayload({ includeFilters })`
//      which collapses L2 + L3 into one L2 + an L1 snapshot.
//   2. Save dialog calls `serializeLayoutConfig(l2, l1Snapshot)` to produce
//      the on-disk JSON, then PUT/POSTs via ApiService.
//   3. On success, `applySavedSnapshot(newL2, layoutId)` is invoked so the
//      grid resets L3 and treats the freshly-saved layout as the active one.

import { useEffect, useState } from "react";
import PropTypes from "prop-types";
import { ApiService } from "@services/ApiService.js";
import { columnMenuStyle } from "../../utils/styles.js";
import { serializeLayoutConfig } from "../../utils/layoutConfig.js";
import { LayoutList } from "./LayoutList.jsx";
import { ErrorDisplay } from "./ErrorDisplay.jsx";
import { SaveLayoutDialog } from "./SaveLayoutDialog.jsx";
import { LayoutActions } from "./LayoutActions.jsx";

function LayoutMenu({
  documentName,
  dirty = false,
  layouts,
  layoutsLoading = false,
  layoutsError = null,
  refetchLayouts,
  activeLayout = null,
  onLayoutLoad,
  buildSavePayload,
  onSavedSnapshot,
  onClose,
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [newLayoutName, setNewLayoutName] = useState("");
  const [newLayoutType, setNewLayoutType] = useState("private");
  const [includeFilters, setIncludeFilters] = useState(false);
  const [selectedLayout, setSelectedLayout] = useState(null);

  // Keep selection coherent with the layout list. When the active layout
  // changes (e.g. after a save), reflect that.
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
    if (activeLayout) setSelectedLayout(activeLayout);
  }, [layouts, activeLayout, selectedLayout]);

  const handleSaveLayout = async () => {
    if (!newLayoutName.trim()) {
      setError("Layout name is required");
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const { l2: newL2, l1Snapshot } = buildSavePayload({ includeFilters });
      const columnConfig = serializeLayoutConfig(newL2, l1Snapshot);

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
        // Reset L3 to empty and treat the saved layout as the active one.
        if (typeof onSavedSnapshot === "function") {
          onSavedSnapshot(newL2, persisted.id);
        }
      }

      setSaveDialogOpen(false);
      setNewLayoutName("");
      setNewLayoutType("private");
      setIncludeFilters(false);
    } catch (err) {
      setError(err.message || "Failed to save layout");
    } finally {
      setSaving(false);
    }
  };

  const handleLoadLayout = async (layout) => {
    try {
      setError(null);
      // Confirm-on-switch when L3 has unsaved tweaks. Skip the prompt when
      // the user clicks the already-active layout (no behaviour change to
      // discard).
      if (dirty && (!activeLayout || activeLayout.id !== layout.id)) {
        const ok = window.confirm(
          "You have unsaved manual changes. Switching layouts will discard them. Continue?"
        );
        if (!ok) return;
      }
      setSelectedLayout(layout);
      if (typeof onLayoutLoad === "function") {
        onLayoutLoad(layout.column_config, layout);
      }
      onClose();
    } catch (err) {
      setError(err.message || "Failed to load layout");
    }
  };

  const handleDeleteLayout = async (layoutId) => {
    if (!window.confirm("Are you sure you want to delete this layout?")) return;

    try {
      setError(null);
      await ApiService.deleteLayout(layoutId);
      if (selectedLayout?.id === layoutId) setSelectedLayout(null);
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
      // Preserve the existing layout's filter-saving choice as the default.
      setIncludeFilters(Boolean(selectedLayout.column_config?.savedFilters));
    } else {
      setNewLayoutName("");
      setNewLayoutType("private");
      setIncludeFilters(false);
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
    setIncludeFilters(false);
  };

  const displayedError = error || layoutsError;

  return (
    <div style={columnMenuStyle}>
      <div className="font-semibold text-sm mb-4">Layout Manager</div>

      <ErrorDisplay error={displayedError} />

      {layoutsLoading ? (
        <div className="text-center text-xs text-gray-600 py-8">Loading layouts...</div>
      ) : (
        <div className="max-h-[300px] overflow-y-auto">
          <LayoutList
            layoutList={layouts.private}
            title="Private Layouts"
            selectedLayoutId={selectedLayout?.id}
            activeLayoutId={activeLayout?.id}
            dirty={dirty}
            onLoad={handleLoadLayout}
            onDelete={handleDeleteLayout}
            onSetDefault={handleSetDefault}
          />
          <div className="bg-gray-200 h-px my-4" />
          <LayoutList
            layoutList={layouts.public}
            title="Public Layouts"
            selectedLayoutId={selectedLayout?.id}
            activeLayoutId={activeLayout?.id}
            dirty={dirty}
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
          includeFilters={includeFilters}
          saving={saving}
          onNameChange={setNewLayoutName}
          onTypeChange={setNewLayoutType}
          onIncludeFiltersChange={setIncludeFilters}
          onSave={handleSaveLayout}
          onCancel={handleCancelSave}
        />
      ) : (
        <LayoutActions
          selectedLayout={selectedLayout}
          dirty={dirty}
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
  dirty: PropTypes.bool,
  layouts: PropTypes.shape({
    private: PropTypes.array,
    public: PropTypes.array,
  }).isRequired,
  layoutsLoading: PropTypes.bool,
  layoutsError: PropTypes.string,
  refetchLayouts: PropTypes.func.isRequired,
  activeLayout: PropTypes.object,
  onLayoutLoad: PropTypes.func.isRequired,
  buildSavePayload: PropTypes.func.isRequired,
  onSavedSnapshot: PropTypes.func,
  onClose: PropTypes.func.isRequired,
};

export { LayoutMenu };
