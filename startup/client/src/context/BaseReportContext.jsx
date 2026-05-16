import { createContext } from 'react';

/**
 * Carries `<BaseReport>`'s loaded state down to custom grid wrappers without
 * threading props through a render-prop.
 *
 * Value shape: `{ rows, columns, setRows, setColumns, isFiltering, isLoadingData, dataGridRef }`.
 * Read it via `useBaseReportState()`.
 *
 * Standalone callers can wrap their own `<Provider>` around the wrapper,
 * owning the state themselves — no enclosing `<BaseReport>` is required.
 */
const BaseReportContext = createContext(null);

export { BaseReportContext };
