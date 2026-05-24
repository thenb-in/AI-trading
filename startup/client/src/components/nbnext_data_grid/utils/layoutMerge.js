// 3-layer layout model. Pure helpers — no hooks, no React, no IO.
//
// L1 (original)       — normalized columns from the backend. Re-set on every
//                       report run. Defines what fields exist + the server's
//                       default hide/frozen/width.
// L2 (saved layout)   — sparse `byField` overrides + sortModel + optional
//                       per-column filterModel. Loaded from DB.
// L3 (manual)         — sparse, in-memory only. Survives across report runs.
//                       Entries for absent fields stay in state but have no
//                       render effect; they reactivate if the field returns.
//
// The merge is field-wise for `hide`/`frozen`/`width`/`order`, and whole-value
// for `sortModel`/`filterModel` (null at a layer = "no assertion at this
// layer", which delegates to the next layer down).

import { DEFAULT_COLUMN_WIDTH } from "./constants.js";

const EMPTY_OVERRIDES = Object.freeze({});

const makeEmptyL3 = () => ({
  byField: {},
  order: null,
  sortModel: null,
  filterModel: null,
});

const isL3Empty = (l3) => {
  if (!l3) return true;
  if (l3.order !== null) return false;
  if (l3.sortModel !== null) return false;
  if (l3.filterModel !== null) return false;
  return Object.keys(l3.byField || {}).length === 0;
};

// Per-cell merge: L3 wins if it asserted, else L2 if it asserted, else L1.
// `undefined` at a layer means "not asserted at this layer."
const pickFieldValue = (key, field, l1Col, l2, l3) => {
  const l3v = l3?.byField?.[field]?.[key];
  if (l3v !== undefined) return l3v;
  const l2v = l2?.byField?.[field]?.[key];
  if (l2v !== undefined) return l2v;
  return l1Col?.[key];
};

const baseWidthFor = (col) => {
  if (Number.isFinite(col.width)) return col.width;
  const name = col.headerName || col.field || "";
  const computed = 15 * name.length + 18 + 22 + 32 + 32;
  return Math.max(computed, 80, DEFAULT_COLUMN_WIDTH);
};

// Resolve render order. Each level supplies a `fields[]` snapshot; we honour
// the latest level that asserted, dropping fields no longer in L1 and slotting
// brand-new L1 fields at their natural position relative to the asserted order.
const resolveOrder = (l1Fields, l2Order, l3Order) => {
  const asserted = l3Order ?? l2Order ?? null;
  if (!asserted) return l1Fields.slice();

  const l1Set = new Set(l1Fields);
  const retained = asserted.filter((f) => l1Set.has(f));
  const retainedSet = new Set(retained);
  const missing = l1Fields.filter((f) => !retainedSet.has(f));
  if (missing.length === 0) return retained;

  const result = [...retained];
  for (const field of missing) {
    const naturalIdx = l1Fields.indexOf(field);
    let insertAfter = -1;
    for (let i = naturalIdx - 1; i >= 0; i--) {
      const pos = result.indexOf(l1Fields[i]);
      if (pos !== -1) {
        insertAfter = pos;
        break;
      }
    }
    result.splice(insertAfter + 1, 0, field);
  }
  return result;
};

// Merge L1 + L2 + L3 into the effective render state. The returned shape is
// what the grid hooks/components consume; callers never look at raw L2/L3
// during render.
const mergeLayout = (l1, l2, l3, fallbackSortModel = []) => {
  const safeL1 = Array.isArray(l1) ? l1 : [];
  const safeL3 = l3 || makeEmptyL3();
  const l1Fields = safeL1.map((c) => c.field);

  const columnOrder = resolveOrder(l1Fields, l2?.order ?? null, safeL3.order);

  const columnVisibility = {};
  const frozenState = {};
  const columnWidths = {};

  for (const col of safeL1) {
    const f = col.field;
    const hide = pickFieldValue("hide", f, col, l2, safeL3);
    const frozen = pickFieldValue("frozen", f, col, l2, safeL3);
    const width = pickFieldValue("width", f, col, l2, safeL3) ?? baseWidthFor(col);
    columnVisibility[f] = !hide;
    frozenState[f] = frozen === true;
    columnWidths[f] = width;
  }

  const sortModel =
    safeL3.sortModel ?? (l2?.sortModel ?? fallbackSortModel) ?? [];
  const filterModel =
    safeL3.filterModel ?? (l2?.filterModel ?? null) ?? {};

  return {
    columnOrder,
    columnVisibility,
    frozenState,
    columnWidths,
    sortModel,
    filterModel,
  };
};

// Collapse L2 + L3 into the new L2 to persist. Field-level overrides merge
// (L3 wins per key); sort/filter/order pick L3 if asserted else L2.
//
// `includeFilters` gates whether the current filterModel is captured into the
// saved layout — controlled by the "Save filters" toggle in the save dialog.
const collapseLayout = (l2, l3, { includeFilters = false } = {}) => {
  const safeL3 = l3 || makeEmptyL3();
  const merged = { byField: {} };

  // Per-field: start with L2's overrides, then layer L3 on top per key.
  const fields = new Set([
    ...Object.keys(l2?.byField || EMPTY_OVERRIDES),
    ...Object.keys(safeL3.byField || EMPTY_OVERRIDES),
  ]);
  for (const f of fields) {
    const l2Entry = l2?.byField?.[f] || EMPTY_OVERRIDES;
    const l3Entry = safeL3.byField?.[f] || EMPTY_OVERRIDES;
    const combined = { ...l2Entry, ...l3Entry };
    // Drop empty entries — overrides should stay sparse.
    if (Object.keys(combined).length > 0) {
      merged.byField[f] = combined;
    }
  }

  merged.order = safeL3.order ?? l2?.order ?? null;
  merged.sortModel = safeL3.sortModel ?? l2?.sortModel ?? [];

  if (includeFilters) {
    merged.filterModel = safeL3.filterModel ?? l2?.filterModel ?? {};
    merged.savedFilters = true;
  } else {
    merged.filterModel = null;
    merged.savedFilters = false;
  }

  return merged;
};

// Layout-active check: loose equality on what L2 asserts vs. current L2.
// "Active" here means the loaded layout is still the active one; L3 dirtiness
// is reported separately (so the UI can render `name*`).
const layoutsEqual = (a, b) => {
  if (a === b) return true;
  if (!a || !b) return false;

  const aFields = Object.keys(a.byField || {}).sort();
  const bFields = Object.keys(b.byField || {}).sort();
  if (aFields.length !== bFields.length) return false;
  for (let i = 0; i < aFields.length; i++) {
    if (aFields[i] !== bFields[i]) return false;
    const ae = a.byField[aFields[i]];
    const be = b.byField[bFields[i]];
    const aKeys = Object.keys(ae).sort();
    const bKeys = Object.keys(be).sort();
    if (aKeys.length !== bKeys.length) return false;
    for (let k = 0; k < aKeys.length; k++) {
      if (aKeys[k] !== bKeys[k]) return false;
      if (ae[aKeys[k]] !== be[bKeys[k]]) return false;
    }
  }

  const aOrder = a.order || null;
  const bOrder = b.order || null;
  if ((aOrder == null) !== (bOrder == null)) return false;
  if (aOrder && bOrder) {
    if (aOrder.length !== bOrder.length) return false;
    for (let i = 0; i < aOrder.length; i++) {
      if (aOrder[i] !== bOrder[i]) return false;
    }
  }

  const aSort = a.sortModel || [];
  const bSort = b.sortModel || [];
  if (aSort.length !== bSort.length) return false;
  for (let i = 0; i < aSort.length; i++) {
    if (aSort[i].field !== bSort[i].field) return false;
    if (aSort[i].sort !== bSort[i].sort) return false;
  }

  return true;
};

export {
  makeEmptyL3,
  isL3Empty,
  mergeLayout,
  collapseLayout,
  layoutsEqual,
  resolveOrder,
  baseWidthFor,
};
