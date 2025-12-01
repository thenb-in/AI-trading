const MAX_CELL_THRESHOLD = 5000;
const DEFAULT_COLUMN_WIDTH = 150;
const TOOLBAR_HEIGHT = 44;

const DENSITY_CONFIG = {
  compact: { rowHeight: 40, headerHeight: 56 },
  standard: { rowHeight: 48, headerHeight: 56 },
  comfortable: { rowHeight: 52, headerHeight: 56 },
};

const SORT_DIRECTIONS = {
  NONE: null,
  ASC: "asc",
  DESC: "desc",
};

export { MAX_CELL_THRESHOLD, DEFAULT_COLUMN_WIDTH, TOOLBAR_HEIGHT, DENSITY_CONFIG, SORT_DIRECTIONS };

