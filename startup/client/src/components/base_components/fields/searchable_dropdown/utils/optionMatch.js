// The text an option is found by, strongest first: its `searchKeys` (an item's
// code, then name, then other names), or its label when it names none.
const keysOf = (option) => (option.searchKeys ?? [option.label])
  .map((key) => String(key ?? '').toLowerCase())
  .filter(Boolean);

/**
 * How well an option matches the typed term, lower is better, null for no
 * match: a key equal to the term beats one that starts with it, which beats
 * one that only contains it; within the same strength the earlier key wins.
 * So typing "502" lists the item coded 502, then codes starting 502, then
 * names holding 502.
 */
const matchRank = (option, needle) => {
  const keys = keysOf(option);
  let best = null;
  keys.forEach((key, index) => {
    const strength = key === needle ? 0 : key.startsWith(needle) ? 1 : key.includes(needle) ? 2 : null;
    if (strength === null) return;
    const rank = strength * keys.length + index;
    if (best === null || rank < best) best = rank;
  });
  return best;
};

const isExactMatch = (option, needle) => keysOf(option).includes(needle);

export { matchRank, isExactMatch };
