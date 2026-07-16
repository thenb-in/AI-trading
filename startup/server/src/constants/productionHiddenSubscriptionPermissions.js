const {
  MASTER_PERMISSION_CONSTANTS,
  REPORT_PERMISSION_CONSTANTS
} = require('./permissions');


const PRODUCTION_HIDDEN_PERMISSION_GROUPS = [
  MASTER_PERMISSION_CONSTANTS.VASTRAM_DAILY_COUNTER,
  REPORT_PERMISSION_CONSTANTS.VASTRAM_DAILY_PERFORMANCE_REPORT
];

const PRODUCTION_HIDDEN_PERMISSION_NAMES = new Set(
  PRODUCTION_HIDDEN_PERMISSION_GROUPS.flatMap((group) => {
    if (!group) {
      return [];
    }
    if (group.name) {
      return [group.name];
    }
    return Object.values(group).map((p) => p?.name).filter(Boolean);
  })
);

module.exports = {
  PRODUCTION_HIDDEN_PERMISSION_NAMES
};
