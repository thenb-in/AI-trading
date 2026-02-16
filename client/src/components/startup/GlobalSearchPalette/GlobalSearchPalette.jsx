import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import PropTypes from "prop-types";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Divider,
  List,
  Typography,
} from "@mui/material";
import { getMasterModules } from "@data/getMasterModules";
import { reports, categories as reportCategories } from "@data/getReportModules";
import { useDataContext, hasPermission } from "@context/startup/useDataContext";
import { MasterModal, MasterSearchInput } from "../BaseMasterComponents";
import { SearchResultItem } from "./SearchResultItem";
import { filterAndSortItems } from "@utils/startup/searchUtils";

const MASTER = "Master";
const REPORT = "Report";
const MAX_RESULTS = 20;
const PALETTE_Z_INDEX = 20000;

function getMasterPermissionName(module) {
  if (module.permissionName) return module.permissionName;
  if (module.id) return `read_${module.id}`;
  return `read_${String(module.title || "")
    .toLowerCase()
    .trim()
    .replace(/ /g, "_")}`;
}

function getReportCategoryLabel(categoryId) {
  return reportCategories.find((c) => c.id === categoryId)?.name || categoryId || "Uncategorized";
}

function GlobalSearchPalette({ 
  shortcutLabel = "Alt + S", 
  open: externalOpen,
  onClose: externalOnClose 
}) {
  const navigate = useNavigate();
  const dataContext = useDataContext();
  const inputRef = useRef(null);

  const [internalOpen, setInternalOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  // Use external control if provided, otherwise use internal state
  const setOpen = useMemo(() => {
    return externalOnClose ? (value) => {
      if (!value) externalOnClose();
    } : setInternalOpen;
  }, [externalOnClose]);

  const open = externalOpen !== undefined ? externalOpen : internalOpen;

  const handleClose = useCallback(() => {
    setOpen(false);
    setQuery("");
    setActiveIndex(0);
  }, [setOpen]);

  // Focus input when palette opens
  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [open]);

  const items = useMemo(() => {
    const handleOpenMaster = (path) => navigate(`/admin/master/${path}`);
    const masterModules = getMasterModules(handleOpenMaster);

    const masters = masterModules
      .filter((module) => {
        if (module.skipPermissionCheck) return true;
        const permissionName = getMasterPermissionName(module);
        return hasPermission(permissionName, dataContext);
      })
      .map((module) => ({
        type: MASTER,
        title: module.title,
        description: module.description,
        category: module.category || "Uncategorized",
        tags: module.tags || [],
        keywords: module.keywords || "",
        onSelect: module.onClick,
      }));

    const reportItems = reports
      .filter((report) => {
        const permissionName = report.permissionName || `read_${report.id}`;
        return hasPermission(permissionName, dataContext);
      })
      .map((report) => {
        const handleSelect = () => navigate(`/admin/report/${report.slug}`);
        return {
          type: REPORT,
          title: report.title,
          description: report.desc,
          category: getReportCategoryLabel(report.category),
          tags: report.tags || [],
          keywords: "", // Reports don't have explicit keywords field in data
          onSelect: handleSelect,
        };
      });

    return [...masters, ...reportItems];
  }, [dataContext, navigate]);

  const { items: filtered, total: totalFound } = useMemo(() => 
    filterAndSortItems(items, query, MAX_RESULTS), 
  [items, query]);

  useEffect(() => {
    setActiveIndex((idx) => Math.min(Math.max(idx, 0), Math.max(filtered.length - 1, 0)));
  }, [filtered.length]);

  const openPalette = useCallback(() => {
    setOpen(true);
    setActiveIndex(0);
  }, [setOpen]);

  useEffect(() => {
    const onKeyDown = (e) => {
      const isAltS = e.altKey && (e.key === "s" || e.key === "S" || e.code === "KeyS");
      const isCtrlK = (e.ctrlKey || e.metaKey) && (e.key === "k" || e.key === "K");

      if (isAltS || isCtrlK) {
        e.preventDefault();
        if (!open) openPalette();
        return;
      }

      if (!open) return;

      if (e.key === "Escape") {
        e.preventDefault();
        handleClose();
        return;
      }

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((idx) => Math.min(idx + 1, Math.max(filtered.length - 1, 0)));
        return;
      }

      if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((idx) => Math.max(idx - 1, 0));
        return;
      }

      if (e.key === "Enter") {
        const item = filtered[activeIndex];
        if (!item) return;
        e.preventDefault();
        handleClose();
        item.onSelect?.();
      }
    };

    document.addEventListener("keydown", onKeyDown, true);
    return () => document.removeEventListener("keydown", onKeyDown, true);
  }, [activeIndex, filtered, handleClose, open, openPalette]);

  const handleItemClick = useCallback(
    (item) => {
      handleClose();
      item.onSelect?.();
    },
    [handleClose]
  );

  const renderSearchResultItem = useCallback((item, idx) => (
    <SearchResultItem
      key={`${item.type}-${item.title}-${idx}`}
      item={item}
      idx={idx}
      activeIndex={activeIndex}
      onMouseEnter={setActiveIndex}
      onClick={handleItemClick}
      query={query}
    />
  ), [activeIndex, handleItemClick, query]);

  return (
    <MasterModal
      isOpen={open}
      onClose={handleClose}
      fullWidth
      maxWidth="sm"
      sx={{ zIndex: PALETTE_Z_INDEX }}
      PaperProps={{
        sx: {
          mt: 10,
          borderRadius: 2,
          overflow: "hidden",
          position: "relative",
          zIndex: PALETTE_Z_INDEX + 1,
        },
      }}
      BackdropProps={{
        sx: { zIndex: PALETTE_Z_INDEX },
      }}
      title={
        <Box
          sx={{
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
            gap: 2,
            flexGrow: 1,
            mr: 1,
          }}
        >
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
           Global Search
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {shortcutLabel} / Ctrl+K
          </Typography>
        </Box>
      }
    >
      <Box sx={{ pt: 0.5 }}>
        <MasterSearchInput
          ref={inputRef}
          value={query}
          onChange={setQuery}
          placeholder="Type to search masters and reports…"
          className="md:max-w-none"
        />
        {query.trim() && (
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block", textAlign: "right", px: 1 }}>
            Found {totalFound} results
          </Typography>
        )}
      </Box>

      <Divider sx={{ my: 2 }} />

      <Box sx={{ maxHeight: 420, overflow: "auto", mx: -3, px: 3 }}>
        {filtered.length ? (
          <List disablePadding>
            {filtered.map(renderSearchResultItem)}
          </List>
        ) : (
          <Box sx={{ p: 3, textAlign: "center" }}>
            <Typography variant="body2" color="text.secondary">
              No results found.
            </Typography>
          </Box>
        )}
      </Box>
    </MasterModal>
  );
}

GlobalSearchPalette.propTypes = {
  shortcutLabel: PropTypes.string,
  open: PropTypes.bool,
  onClose: PropTypes.func,
};

export { GlobalSearchPalette };
