// Backtest money/percent formatting, shared by every backtest report.
// rs: signed rupee amount with Indian grouping and a true minus sign; pc: one-decimal percent.
export const rs = (v) => v == null ? '—' : `${v < 0 ? '−' : ''}₹${Math.abs(Math.round(v)).toLocaleString('en-IN')}`;
export const pc = (v) => v == null ? '—' : `${Number(v).toFixed(1)}%`;
