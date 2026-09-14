import {
  getOperatorsForType,
  isValueLessOperator,
  normalizeFieldType,
  OPERATOR_LABELS,
} from "@utils/masterAdvancedFilterUtils";

/**
 * Per-column filter entries for the grid's filter bar.
 *
 * The bar has always been "type text, match anything containing it". That is
 * still what typing does; the operator button beside each input is how a user
 * says they meant something narrower.
 *
 * Entries are `{ operator, value }`. Saved layouts written before operators
 * existed hold a bare string, which reads as a `contains` on that string — so
 * an old layout keeps filtering exactly as it did.
 */

const DEFAULT_OPERATOR = "contains";

/** Operators that match on what the cell *displays*, not its underlying value. */
const TEXT_OPERATORS = new Set(["contains", "not_contains", "starts_with", "ends_with"]);

/** Compact symbols for the operator button. The full label is its tooltip. */
const OPERATOR_SYMBOL = {
  contains: "∗",
  not_contains: "!∗",
  equals: "=",
  not_equals: "≠",
  starts_with: "a‥",
  ends_with: "‥z",
  greater_than: ">",
  less_than: "<",
  greater_or_equal: "≥",
  less_or_equal: "≤",
  before: "<",
  after: ">",
  on_or_before: "≤",
  on_or_after: "≥",
  is_set: "•",
  is_not_set: "∅",
};

/** A column's `{ operator, value }`; a column with no entry yet reads as an empty "contains". */
const normalizeFilterEntry = (entry) => {
  if (entry === null || entry === undefined) return { operator: DEFAULT_OPERATOR, value: "" };
  return {
    operator: entry.operator || DEFAULT_OPERATOR,
    value: entry.value ?? "",
  };
};

/**
 * Is this entry actually narrowing anything? An empty box filters nothing —
 * except under "is set"/"is not set", which are the question themselves.
 */
const isFilterEntryActive = (entry) => {
  const { operator, value } = normalizeFilterEntry(entry);
  if (isValueLessOperator(operator)) return true;
  return String(value ?? "").trim() !== "";
};

const hasAnyActiveFilter = (filterModel) =>
  Object.values(filterModel || {}).some(isFilterEntryActive);

/**
 * What kind of thing a column holds, for deciding which operators apply.
 *
 * A declared `type` wins. Most grid columns declare none, though — a report's
 * columns come from whatever the query returned — and defaulting those to text
 * would offer "starts with" on an amount column and hide "greater than". So
 * when nothing is declared, the first handful of non-empty values decide, and
 * they must agree unanimously: one stray "N/A" in an amount column means the
 * column really does hold text, and comparing it as a number would drop rows.
 */
const SAMPLE_SIZE = 30;

const inferColumnType = (column, rows = []) => {
  const declared = column?.type;
  if (declared && String(declared).toLowerCase() !== "string") {
    return normalizeFieldType(declared);
  }

  const field = column?.field;
  if (!field) return "text";

  const samples = [];
  for (let i = 0; i < rows.length && samples.length < SAMPLE_SIZE; i += 1) {
    const value = rows[i]?._row ? rows[i]._row[field] : rows[i]?.[field];
    if (value !== null && value !== undefined && String(value).trim() !== "") {
      samples.push(value);
    }
  }
  if (samples.length === 0) return "text";

  if (samples.every((v) => typeof v === "boolean")) return "boolean";
  if (samples.every((v) => typeof v === "number" && Number.isFinite(v))) return "number";
  if (samples.every((v) => v instanceof Date && !Number.isNaN(v.getTime()))) return "date";
  // Strings that are unambiguously an ISO date, not just anything Date.parse()
  // will swallow — "12" parses as a year, and that is not a date column.
  if (samples.every((v) => typeof v === "string" && /^\d{4}-\d{2}-\d{2}([T ]|$)/.test(v.trim()))) {
    return "date";
  }
  return "text";
};

/**
 * Operators offered for a column. `contains` leads the list for every type,
 * including numbers and dates: it is the default, it is what the bar has
 * always done, and "invoice no. contains 42" is a question people ask.
 */
const getColumnFilterOperators = (columnType) => {
  const typed = getOperatorsForType(columnType);
  if (typed.some((operator) => operator.value === DEFAULT_OPERATOR)) return typed;
  return [{ value: DEFAULT_OPERATOR, label: OPERATOR_LABELS[DEFAULT_OPERATOR] }, ...typed];
};

/**
 * Which value a given operator should be handed: the formatted display text
 * for the text operators, the underlying value for everything else. Matching
 * "contains 14/05" against an ISO timestamp would surprise anyone reading the
 * column, and comparing "greater than 100" against "₹1,00,000" would fail.
 */
const subjectForOperator = (operator, columnType, cellText, cellValue) =>
  TEXT_OPERATORS.has(operator)
    ? { fieldType: "text", subject: cellText }
    : { fieldType: normalizeFieldType(columnType), subject: cellValue };

export {
  DEFAULT_OPERATOR,
  inferColumnType,
  OPERATOR_SYMBOL,
  normalizeFilterEntry,
  isFilterEntryActive,
  hasAnyActiveFilter,
  getColumnFilterOperators,
  subjectForOperator,
};
