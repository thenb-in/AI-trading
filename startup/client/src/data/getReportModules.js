import { reports, categories } from '@app/data/getReportModules';

/**
 * Maps permission names to report display names
 * This allows easy customization of report names in permissions UI
 * Key: permission name (as it appears in server), Value: display name
 */
const REPORT_PERMISSION_NAME_MAP = {};
reports.forEach(report => {
  if (report.permissionName) {
    REPORT_PERMISSION_NAME_MAP[report.permissionName.toLowerCase()] = report.title;
  }
});

/**
 * Gets the display name for a report permission
 * @param {string} permissionName - The permission name (e.g., 'read_detailed-attendance-report')
 * @returns {string} The display name for the report, or null if not found
 */
function getReportDisplayName(permissionName) {
  if (!permissionName) return null;
  return REPORT_PERMISSION_NAME_MAP[permissionName.toLowerCase()] || null;
}

/**
 * Gets all report permission name mappings
 * @returns {Object} Object mapping permission names to display names
 */
function getReportPermissionNameMap() {
  return { ...REPORT_PERMISSION_NAME_MAP };
}

export {
  getReportDisplayName,
  getReportPermissionNameMap,
  reports,
  categories,
};
