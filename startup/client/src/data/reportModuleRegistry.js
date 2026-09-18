import { getGenericReportModules, genericReportCategories } from './genericReportModules';

const reports = [];
const categories = [];

// A report's route and API path is its id with dashes (stock_balance_report ->
// stock-balance-report), unless the report names its own slug.
const withSlug = (report) => ({ slug: report.id.replace(/_/g, '-'), ...report });

/**
 * Framework reports first, the app's on top.
 */
const composeReports = (appReports = [], appCategories = []) => {
  const sluggedAppReports = appReports.map(withSlug);
  const appReportSlugs = new Set(sluggedAppReports.map((report) => report.slug));
  reports.length = 0;
  reports.push(
    ...getGenericReportModules().map(withSlug).filter((report) => !appReportSlugs.has(report.slug)),
    ...sluggedAppReports
  );

  const appCategoryIds = new Set(appCategories.map((category) => category.id));
  categories.length = 0;
  categories.push(
    ...genericReportCategories.filter((category) => !appCategoryIds.has(category.id)),
    ...appCategories
  );
};

const registerAppReports = (appReports, appCategories) => {
  composeReports(
    Array.isArray(appReports) ? appReports : [],
    Array.isArray(appCategories) ? appCategories : []
  );
};

// The framework's own reports are there before (and without) an app registering.
composeReports();

export { reports, categories, registerAppReports };
