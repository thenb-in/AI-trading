import { Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import PropTypes from 'prop-types';
import { ReportList } from './ReportComponents/ReportList';
// import PastReportPage from './ReportComponents/PastReportPage';
import { reports, categories } from '../../data/getReportModules';

const staticPages = ['past-report'];

const DummyReportComponent = ({ report }) => (
  <div className="p-6 bg-white rounded-xl border border-gray-200">
    <h2 className="text-xl font-semibold text-gray-800 mb-2">{report.title}</h2>
    <p className="text-gray-600">This report does not have a view yet.</p>
  </div>
);

DummyReportComponent.propTypes = {
  report: PropTypes.shape({
    title: PropTypes.string.isRequired,
  }).isRequired,
};

const ReportContent = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const currentSlug = location.pathname.split('/').pop();
  const currentReport = reports.find((r) => r.slug === currentSlug);
  const isStatic = staticPages.includes(currentSlug);

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
      {/* <Route path="past-report" element={<PastReportPage />} /> */}

      {reports.map((report) => {
        const Component = report.component || DummyReportComponent;
        return (
          <Route
            key={report.slug}
            path={report.slug}
            element={<Component report={report} locationState={location.state} />}
          />
        );
      })}

      <Route path="*" element={<ReportList reports={reports} categories={categories} />} />
    </Routes>
    </div>
  );
};

export { ReportContent };
