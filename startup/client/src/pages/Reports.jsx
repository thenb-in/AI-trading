import { Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { ReportRunMaster } from '@startup/components/masters/report_run_master/ReportRunMaster';
import { ReportList } from './report_components/ReportList';
import { DummyComponent } from './DummyComponent';
import { reports, categories } from '../data/getReportModules';
import { getReportStaticPages } from '../data/appRouteRegistry';

const ReportContent = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const staticPages = getReportStaticPages();
  const currentSlug = location.pathname.split('/').pop();
  const currentReport = reports.find((r) => r.slug === currentSlug);
  const isStatic = staticPages.some((page) => page.path === currentSlug);

  // Do not redirect slugged report routes; only redirect when exactly at /admin/report
  useEffect(() => {
    if (!currentReport && !isStatic && location.pathname === '/admin/report') {
      navigate('/admin/report', { replace: true });
    }
  }, [currentReport, isStatic, location.pathname, navigate]);

  return (
    <div className="px-4 py-4 sm:px-6 lg:px-8 max-w-8xl mx-auto">
      <Routes>
        <Route index element={<ReportList reports={reports} categories={categories} />} />
        <Route path="manager" element={<ReportRunMaster />} />

        {staticPages.map((page) => (
          <Route key={page.path} path={page.path} element={page.element} />
        ))}

        {reports.map((report) => {
          const Component = report.component;

          return (
            <Route
              key={report.slug}
              path={report.slug}
              element={
                report.component ? (
                  <Component
                    report={report}
                    locationState={location.state}
                  />
                ) : (
                  <DummyComponent component={report} />
                )
              }
            />
          );
        }
        )}

        <Route path="*" element={<ReportList reports={reports} categories={categories} />} />
      </Routes>
    </div>
  );
};

export { ReportContent };
