import { isExportFooterRow } from '@startup/utils/excelImportFooter';
import { loadFirstWorksheet } from '../utils/importParsingEngine';

/**
 * Turns a cell back into the value the API wants, using the column definitions the grid was
 * built from. Import is the inverse of export, so it has to undo exactly what export did:
 *
 *  - a `select` column exports its option LABEL ("Sales"), not the id it stores, so the
 *    label is resolved back through the same option list. A file that carries raw ids still
 *    works, because an exact value match is accepted too.
 *  - a `boolean` column round-trips as true/false or Yes/No.
 *
 * Both are derived from `columns` rather than declared per master: every master already
 * hands its column definitions in, and a list repeated at each call site is a list that goes
 * stale. `extraBooleanFields` stays available for a column the server does not type.
 *
 * A select value that matches nothing is reported rather than guessed at — writing an
 * unrecognised department name into an id column just moves the failure to the server.
 */
function buildCellCoercer(columns, extraBooleanFields) {
  const booleanFields = new Set([
    ...(extraBooleanFields || []),
    ...columns.filter((c) => c.type === 'boolean').map((c) => c.id),
  ]);
  const selectOptions = new Map(
    columns
      .filter((c) => c.type === 'select' && Array.isArray(c.options))
      .map((c) => [c.id, c.options]),
  );
  const unresolved = [];

  const coerce = (field, rawValue) => {
    const value = typeof rawValue === 'string' ? rawValue.trim() : rawValue;

    if (booleanFields.has(field)) {
      const v = String(value ?? '').toLowerCase().trim();
      if (v === 'true' || v === 'yes' || v === '1' || value === true) return true;
      if (v === 'false' || v === 'no' || v === '0' || value === false) return false;
      return value ?? null;
    }

    const options = selectOptions.get(field);
    if (!options) {
      return value ?? null;
    }
    if (value === null || value === undefined || value === '') {
      return null;
    }
    const text = String(value).trim();
    const match = options.find(
      (o) => String(o.label).trim() === text || String(o.value).trim() === text,
    );
    if (match) {
      return match.value === '' ? null : match.value;
    }
    unresolved.push(`${field}="${text}"`);
    return null;
  };

  return { coerce, unresolved };
}

/**
 * Reads master rows from an Excel workbook produced either by the standard exporter
 * (header on row 5, data from row 6) or a plain sheet (header on row 1), then creates
 * or updates rows via `createOne`/`updateOne` using `keyField` to match existing rows
 * by stable code.
 *
 * Returns the same `{ status, data }` shape that `MasterHeader` already expects from
 * `importApi`, so each master just needs to bind the per-entity create/update/keyField/etc.
 */
async function importMasterFromExcel(
  formData,
  {
    rows,
    columns,
    refresh,
    keyField,
    requiredFields,
    requiredHeaderHint,
    booleanFields,
    createOne,
    updateOne,
  },
) {
  const file = formData.get('file');
  if (!file) {
    return { status: 400, data: { error: 'No file provided' } };
  }

  try {
    const sheet = await loadFirstWorksheet(file);
    if (!sheet) return { status: 400, data: { error: 'No worksheet found' } };

    const buildHeaderMap = (headerRowIndex) => {
      const headerRow = sheet.getRow(headerRowIndex);
      const map = {};
      headerRow.eachCell((cell, colNumber) => {
        const headerText = String(cell.value || '').trim();
        const colDef = columns.find(
          (c) => c.label === headerText || c.id === headerText || c.name === headerText,
        );
        if (colDef) map[colNumber] = colDef.id;
      });
      return map;
    };

    let headerToField = buildHeaderMap(5);
    let dataStartRow = 6;
    let missing = requiredFields.filter((f) => !Object.values(headerToField).includes(f));

    if (missing.length > 0) {
      headerToField = buildHeaderMap(1);
      dataStartRow = 2;
      missing = requiredFields.filter((f) => !Object.values(headerToField).includes(f));
    }

    if (missing.length) {
      return {
        status: 400,
        data: { error: `Missing required columns: ${missing.join(', ')}. Expected headers: ${requiredHeaderHint}` },
      };
    }

    const { coerce, unresolved } = buildCellCoercer(columns, booleanFields);
    const existingByKey = new Map(rows.map((r) => [r[keyField], r]));
    let created = 0;
    let updated = 0;
    let skippedEmpty = 0;
    let duplicatesInFile = 0;
    const seenInFile = new Set();

    for (let r = dataStartRow; r <= sheet.rowCount; r++) {
      const row = sheet.getRow(r);
      if (!row || row.cellCount === 0) continue;

      if (isExportFooterRow(row)) {
        break;
      }

      const payload = {};
      row.eachCell((cell, colNumber) => {
        const field = headerToField[colNumber];
        if (!field) return;
        payload[field] = coerce(field, cell.value);
      });

      const hasAny = Object.values(payload).some((v) => v !== null && v !== '');
      if (!hasAny) { skippedEmpty += 1; continue; }

      const key = payload[keyField]?.toString().trim();
      if (!key) continue;
      if (seenInFile.has(key)) { duplicatesInFile += 1; continue; }
      seenInFile.add(key);

      const existing = existingByKey.get(key);
      if (existing?.id) {
        await updateOne(existing.id, { ...existing, ...payload });
        updated += 1;
      } else {
        await createOne(payload);
        created += 1;
      }
    }

    await refresh();
    // A dropdown value that matched no option was left blank rather than guessed at. Saying
    // so is the difference between a visible gap and a silently emptied column.
    const unmatched = unresolved.length
      ? `. ${unresolved.length} value(s) matched no option and were left blank: ${[...new Set(unresolved)].slice(0, 3).join(', ')}`
      : '';
    return {
      status: 200,
      data: { message: `Imported: ${created} created, ${updated} updated, ${duplicatesInFile} duplicates skipped, ${skippedEmpty} empty rows skipped${unmatched}` },
    };
  } catch (e) {
    return { status: 500, data: { error: e?.message || 'Import failed' } };
  }
}

export { importMasterFromExcel };
