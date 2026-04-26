import {
  Settings as SettingsIcon,
  CloudUpload as CloudUploadIcon,
} from "@mui/icons-material";

const getMasterModules = (handleOpenMaster) => [
{
  id: "activity",
  title: "Audit Logs",
  description: "Track and review all user actions and CRUD operations across every system module and model.",
  icon: SettingsIcon,
  color: "success",
  onClick: () => handleOpenMaster("activity"),
  buttonText: "View Audit Logs",
  tags: ["Audit","Activity","Logs","CRUD","Tracking","System"],
  keywords: "audit logs activity tracking crud operations user actions system history change log",
  category: "System Logs",
  permissionName: "read_activity",
},
{
  id: "nbnext-drive",
  title: "NBnext Drive",
  description: "Upload, view, download, and manage files. Store files with optional object references for future API integration.",
  icon: CloudUploadIcon,
  color: "secondary",
  onClick: () => handleOpenMaster("nbnext-drive"),
  buttonText: "Open Drive",
  tags: ["Files","Storage","Upload","Download","Drive","Documents"],
  keywords: "file storage upload download drive documents files management",
  category: "File Management",
  permissionName: "read_personal_nbnext_drive",
}
];

/**
 * Returns master modules that have onboarding order, sorted by onboarding (1, 2, 3...).
 * Used by AppGuide to show Department, Position, Employee steps.
 * @param {function(string)} handleOpenMaster - (path) => void, e.g. navigate to /admin/master/{path}
 */
const getOnboardingMasters = (handleOpenMaster) => {
  const all = getMasterModules(handleOpenMaster);
  return all
    .filter((m) => m.onboarding != null)
    .sort((a, b) => a.onboarding - b.onboarding);
};

const getMasterCategories = () => {
  const categoryCounts = {};
  const masterModules = getMasterModules(() => { });

  masterModules.forEach((module) => {
    const category = module.category || "Uncategorized";
    categoryCounts[category] = (categoryCounts[category] || 0) + 1;
  });

  const categoryOrder = ["Common Masters", "Management", "Raw Data"];

  const orderedCategories = categoryOrder
    .filter((category) => categoryCounts[category])
    .map((name) => ({ name, count: categoryCounts[name] }));

  const remainingCategories = Object.entries(categoryCounts)
    .filter(([name]) => !categoryOrder.includes(name))
    .map(([name, count]) => ({ name, count }));

  // order remaining categories by name
  const orderedRemainingCategories = remainingCategories.sort((a, b) => a.name.localeCompare(b.name));
  return [...orderedCategories, ...orderedRemainingCategories];
};

/**
 * Returns only categories where the user has permission to at least one master,
 * with count = number of permitted masters in that category.
 * @param {function(string, object)} hasPermissionFn - (permissionName, dataContext) => boolean
 * @param {object} dataContext - from useDataContext()
 * @returns {Array<{ name: string, count: number }>} categories with permitted count
 */
const getMasterCategoriesForUser = (hasPermissionFn, dataContext) => {
  if (!hasPermissionFn || !dataContext) return [];
  const masterModules = getMasterModules(() => { });
  const categoryCounts = {};

  masterModules.forEach((module) => {
    const permission = module.permissionName
      || (module.id ? `read_${module.id}` : `read_${module.title.toLowerCase().replace(/ /g, "_")}`);
    const allowed = module.skipPermissionCheck || hasPermissionFn(permission, dataContext);
    if (allowed) {
      const cat = module.category || "Uncategorized";
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    }
  });

  const categoryOrder = ["Common Masters", "Management", "Raw Data"];
  const ordered = categoryOrder
    .filter((name) => categoryCounts[name])
    .map((name) => ({ name, count: categoryCounts[name] }));
  const remaining = Object.entries(categoryCounts)
    .filter(([name]) => !categoryOrder.includes(name))
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([name, count]) => ({ name, count }));

  return [...ordered, ...remaining];
};

export { getMasterModules, getMasterCategories, getMasterCategoriesForUser, getOnboardingMasters };
