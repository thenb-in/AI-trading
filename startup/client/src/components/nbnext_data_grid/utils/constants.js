const MAX_CELL_THRESHOLD = 5000;
const FULL_SCREEN_WARNING_THRESHOLD = 5 * MAX_CELL_THRESHOLD;
const DEFAULT_COLUMN_WIDTH = 150;
const TOOLBAR_HEIGHT = 44;
const MIN_BODY_HEIGHT = 300; // Minimum height for grid body when no rows are present

const DENSITY_CONFIG = {
  compact: { rowHeight: 36, headerHeight: 56 },
  standard: { rowHeight: 48, headerHeight: 56 },
  comfortable: { rowHeight: 52, headerHeight: 56 },
};

const SORT_DIRECTIONS = {
  ASC: "asc",
  DESC: "desc",
};

export {
  MAX_CELL_THRESHOLD,
  FULL_SCREEN_WARNING_THRESHOLD,
  DEFAULT_COLUMN_WIDTH,
  TOOLBAR_HEIGHT,
  MIN_BODY_HEIGHT,
  DENSITY_CONFIG,
  SORT_DIRECTIONS
};

