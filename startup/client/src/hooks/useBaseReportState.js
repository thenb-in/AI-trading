import { useContext } from 'react';
import { BaseReportContext } from '@startup/context/BaseReportContext';

/**
 * Access the report state managed by the enclosing `<BaseReport>` (or by any
 * caller that wraps its own `<BaseReportContext.Provider>`).
 *
 * Returns `{ rows, columns, setRows, setColumns, isFiltering, isLoadingData, dataGridRef }`.
 * Throws if called outside a provider — that almost always indicates a wiring
 * mistake (the wrapper was mounted standalone with no fallback in place).
 */
const useBaseReportState = () => {
  const ctx = useContext(BaseReportContext);
  if (!ctx) {
    throw new Error('useBaseReportState() must be called inside <BaseReport> or a <BaseReportContext.Provider>.');
  }
  return ctx;
};

export { useBaseReportState };
