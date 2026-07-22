const reports = [];
const categories = [];


const registerAppReports = (appReports, appCategories) => {
  reports.length = 0;
  if (Array.isArray(appReports)) reports.push(...appReports);

  categories.length = 0;
  if (Array.isArray(appCategories)) categories.push(...appCategories);
};

export { reports, categories, registerAppReports };
