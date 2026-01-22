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


export { getMasterModules, getMasterCategories };
