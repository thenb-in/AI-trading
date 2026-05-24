import { useMemo } from "react";
import { detectConstantColumns } from "../utils/constantColumnsUtils";

// Computes the common-values card content from L1 + rows. `assertedFields` is
// the set of column fields the user has expressed any visibility opinion on
// (via L2 or L3) — those columns are excluded from auto-promotion to the card.
const useConstantColumns = (rows, l1Columns, assertedFields = null) => {
  return useMemo(() => {
    const { constantColumns } = detectConstantColumns(rows, l1Columns, assertedFields);
    return { constantColumns };
  }, [rows, l1Columns, assertedFields]);
};

export { useConstantColumns };
