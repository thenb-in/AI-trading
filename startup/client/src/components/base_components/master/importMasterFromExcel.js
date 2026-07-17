import ExcelJS from 'exceljs';
import { isExportFooterRow } from '@startup/utils/excelImportFooter';
import { coerceBooleanCell } from '../utils/importCellHelpers';

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
    const buffer = await file.arrayBuffer();
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    const sheet = workbook.worksheets[0];
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
        let value = cell.value;
        if (typeof value === 'string') value = value.trim();
        if (booleanFields?.includes(field)) {
          value = coerceBooleanCell(value);
        }
        payload[field] = value ?? null;
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
    return {
      status: 200,
      data: { message: `Imported: ${created} created, ${updated} updated, ${duplicatesInFile} duplicates skipped, ${skippedEmpty} empty rows skipped` },
    };
  } catch (e) {
    return { status: 500, data: { error: e?.message || 'Import failed' } };
  }
}

export { importMasterFromExcel };
