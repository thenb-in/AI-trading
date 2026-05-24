// Detect columns where every row holds the same value.
//
// Under the 3-layer layout model, this runs as a render-time overlay over the
// pristine L1 column set. A column qualifies for the common-values card only
// when:
//
//   • all rows hold the same value, AND
//   • the user has NOT asserted visibility on the column (L2 or L3 hide is
//     unset). L3-hide wins over card promotion (user said "hide" → don't show
//     it anywhere); L3-show wins too (user explicitly opted in → keep it as a
//     column).
//
// The `assertedFields` set is the union of fields with any hide override in
// L2 or L3 — callers compute it from `useLayoutState` and pass it in.

const detectConstantColumns = (rows, columns, assertedFields = null) => {
  if (!rows || rows.length === 0 || !columns || columns.length === 0) {
    return { constantColumns: new Map() };
  }

  const constantColumns = new Map();

  for (const col of columns) {
    const field = col.field || col.key;
    if (!field) continue;

    // Skip action columns, hidden columns, skip_insight, and certain types.
    if (
      col.skip_insight === true ||
      col.type === "action" ||
      col.hide === true ||
      col.hidden === true ||
      field === "actions" ||
      (typeof field === "string" && field.includes("_action"))
    ) {
      continue;
    }

    // Respect user assertions: if the user has an L2/L3 opinion on this
    // column's visibility, don't auto-promote it to the card.
    if (assertedFields && assertedFields.has(field)) continue;

    const firstRow = rows[0]._row || rows[0];
    const firstValue = firstRow?.[field];
    let allSame = true;
    for (let i = 1; i < rows.length; i++) {
      const rowData = rows[i]._row || rows[i];
      const val = rowData?.[field];
      if (val === null || val === undefined) {
        if (firstValue !== null && firstValue !== undefined) {
          allSame = false;
          break;
        }
        continue;
      }
      if (firstValue === null || firstValue === undefined) {
        allSame = false;
        break;
      }
      if (typeof val === "object" && val !== null) {
        if (JSON.stringify(val) !== JSON.stringify(firstValue)) {
          allSame = false;
          break;
        }
      } else if (String(val) !== String(firstValue)) {
        allSame = false;
        break;
      }
    }

    if (allSame) {
      constantColumns.set(field, {
        field,
        value: firstValue,
        displayName: col.display_name || col.headerName || col.label || col.name || field,
        type: col.type || "string",
        renderCell: typeof col.renderCell === "function" ? col.renderCell : null,
      });
    }
  }

  return { constantColumns };
};

const constantColumnsToSummary = (constantColumns) => {
  if (!constantColumns || constantColumns.size === 0) return {};

  const summary = {};
  constantColumns.forEach(({ field, value, displayName }) => {
    const baseKey =
      typeof displayName === "string" && displayName.trim() ? displayName.trim() : field;
    let finalKey = baseKey;
    if (Object.prototype.hasOwnProperty.call(summary, finalKey)) {
      finalKey = `${baseKey} (${field})`;
    }
    summary[finalKey] = value;
  });
  return summary;
};

export { detectConstantColumns, constantColumnsToSummary };
