import { reports, categories } from './reportModuleRegistry';


let reportPermissionNameMap = null;

function ensureReportPermissionNameMap() {
  if (reportPermissionNameMap) return reportPermissionNameMap;
  const map = {};
  reports.forEach((report) => {
    if (report.permissionName) {
      map[report.permissionName.toLowerCase()] = report.title;
    }
  });
  reportPermissionNameMap = map;
  return map;
}


function getReportDisplayName(permissionName) {
  if (!permissionName) return null;
  return ensureReportPermissionNameMap()[permissionName.toLowerCase()] || null;
}


function getReportPermissionNameMap() {
  return { ...ensureReportPermissionNameMap() };
}

export {
  getReportDisplayName,
  getReportPermissionNameMap,
  reports,
  categories,
};
