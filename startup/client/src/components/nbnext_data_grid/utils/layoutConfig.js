// Read/write the on-disk shape for a layout's `column_config` JSON.
//
// New shape (sparse, layered model):
//   {
//     version: 2,
//     overrides: { [field]: { hide?, frozen?, width?, order? } },
//     order:     [field, field, ...] | null,
//     sortModel: [{ field, sort }],
//     filterModel: { [field]: string } | null,
//     savedFilters: boolean,
//     l1Snapshot: [{ field, hide, frozen, width? }] | null,  // audit only
//   }
//
// Legacy shape (pre-refactor):
//   {
//     columns:         [{ field, hide, frozen, order }],
//     originalColumns: [{ field, hide, frozen }],   // ignored on read
//     sortModel:       [...],
//   }
//   or a bare array (oldest form): [{ field, hide, frozen, order }, ...]
//
// Legacy layouts adapt to a dense overrides object — every field gets an
// explicit hide/frozen entry, so they keep behaving like the old "freeze
// everything at save time" model. Users who re-save a legacy layout get the
// new sparse form going forward.

// Build the L2 in-memory shape from whatever shape exists on disk.
const adaptLayoutConfig = (raw) => {
  if (!raw) return null;

  // New shape — passes through, defensive normalisation.
  if (raw && typeof raw === "object" && raw.version === 2) {
    return {
      byField: raw.overrides && typeof raw.overrides === "object" ? raw.overrides : {},
      order: Array.isArray(raw.order) ? raw.order.slice() : null,
      sortModel: Array.isArray(raw.sortModel) ? raw.sortModel.slice() : [],
      filterModel:
        raw.filterModel && typeof raw.filterModel === "object" ? { ...raw.filterModel } : null,
      savedFilters: Boolean(raw.savedFilters),
    };
  }

  // Legacy: bare array or `{ columns, sortModel, originalColumns? }`.
  const columnArray = Array.isArray(raw)
    ? raw
    : Array.isArray(raw?.columns)
      ? raw.columns
      : [];
  const sortModel = Array.isArray(raw?.sortModel) ? raw.sortModel.slice() : [];

  const byField = {};
  const ordered = [...columnArray].sort(
    (a, b) => (a.order ?? Infinity) - (b.order ?? Infinity)
  );
  const order = ordered.length > 0 && ordered.some((c) => typeof c.order === "number")
    ? ordered.map((c) => c.field)
    : null;

  columnArray.forEach((c) => {
    if (!c?.field) return;
    const entry = {};
    if (c.hide !== undefined) entry.hide = Boolean(c.hide);
    if (c.frozen !== undefined) entry.frozen = c.frozen === true;
    if (Number.isFinite(c.width)) entry.width = c.width;
    if (Object.keys(entry).length > 0) {
      byField[c.field] = entry;
    }
  });

  return {
    byField,
    order,
    sortModel,
    filterModel: null,
    savedFilters: false,
  };
};

// Serialise an in-memory L2 + an optional L1 snapshot back to the on-disk
// shape. `byField` is already sparse — empty entries are pruned here as a
// safety net, but callers (collapseLayout) should already produce a clean
// shape.
const serializeLayoutConfig = (l2, l1Columns = null) => {
  const overrides = {};
  const src = l2?.byField || {};
  for (const f of Object.keys(src)) {
    const entry = src[f];
    if (entry && Object.keys(entry).length > 0) {
      overrides[f] = { ...entry };
    }
  }

  // L1 snapshot is informational only — captures what backend sent at save
  // time so the layout has an audit trail of which columns existed.
  const l1Snapshot = Array.isArray(l1Columns)
    ? l1Columns.map((c) => {
        const snap = {
          field: c.field,
          hide: Boolean(c.hide),
          frozen: c.frozen === true,
        };
        if (Number.isFinite(c.width)) snap.width = c.width;
        if (c.headerName && c.headerName !== c.field) snap.headerName = c.headerName;
        return snap;
      })
    : null;

  return {
    version: 2,
    overrides,
    order: Array.isArray(l2?.order) ? l2.order.slice() : null,
    sortModel: Array.isArray(l2?.sortModel) ? l2.sortModel.slice() : [],
    filterModel: l2?.savedFilters && l2?.filterModel ? { ...l2.filterModel } : null,
    savedFilters: Boolean(l2?.savedFilters),
    l1Snapshot,
  };
};

export { adaptLayoutConfig, serializeLayoutConfig };
