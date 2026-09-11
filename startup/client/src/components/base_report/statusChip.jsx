const TONES = {
  good: 'text-emerald-700 bg-emerald-50',
  bad: 'text-rose-700 bg-rose-50',
  neutral: 'text-gray-600 bg-gray-50'
};

/**
 * `decorateColumns` that renders `field` as a coloured chip.
 */
function statusChip(field, tones) {
  const renderChip = ({ row }) => {
    const value = row?.[field];
    if (!value) {
      return null;
    }
    const tone = TONES[tones?.[value]] ?? TONES.neutral;
    return <span className={`px-2 py-0.5 rounded text-xs font-medium ${tone}`}>{value}</span>;
  };

  return (columns) => columns.map((column) =>
    (column.field === field ? { ...column, renderCell: renderChip } : column));
}

export { statusChip };
