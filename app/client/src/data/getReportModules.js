// App report definitions, handed to the framework by registerAppData() via
// registerAppReports(reports, categories).
//
// Each entry looks like:
//
//   {
//     id: 'my-report',
//     title: 'My Report',
//     slug: 'my-report',              // must match the server route in reportRoutes.js
//     permissionName: 'read_my-report',
//     desc: 'What the report answers',
//     category: 'attendance',         // one of the ids in `categories` below
//     color: 'blue',
//     icon: SomeLucideIcon,
//     component: MyReport,
//     filtersConfig: MyReportFilters,
//   }
//

const reports = [];


//  { id: 'Categories-name', name: 'Categories' },
const categories = [];

export {
  reports,
  categories,
};
