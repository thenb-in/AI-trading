import { PastReportPage } from "@app/components/report/PastReportPage";

// Routes that render inside the AdminLayout / sidebar.
const appRoutes = [
  
];

// Routes that should NOT use the AdminLayout / sidebar.
const appRoutesWithoutSidebar = [

];

// Static report pages that render at fixed slugs under /admin/report.
const reportStaticPages = [
  { path: "past-report", element: <PastReportPage /> },
];


export { appRoutes, appRoutesWithoutSidebar ,reportStaticPages};
