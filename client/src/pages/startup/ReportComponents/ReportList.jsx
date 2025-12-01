import { useState, useMemo } from 'react';
import PropTypes from 'prop-types';
import { Search } from 'lucide-react';
import { ReportCard } from './ReportCard';
import { NoReportsFound } from './NoReportsFound';
import { hasPermission, useDataContext } from '../../../context/startup/useDataContext';

const ReportList = ({ reports, categories }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const dataContext = useDataContext();

  const filteredReports = useMemo(() => {
    return reports.filter(report => {
      const matchesFilter = activeFilter === 'all' || report.category === activeFilter;
      const matchesSearch = report.title.toLowerCase().includes(searchTerm.toLowerCase());
      const permissionName = "read_" + report.id;
      const isPermissionGranted = hasPermission(permissionName, dataContext);
      return matchesFilter && matchesSearch && isPermissionGranted;
    });
  }, [reports, searchTerm, activeFilter]);

  const handleResetFilters = () => {
    setSearchTerm('');
    setActiveFilter('all');
  };

  const handleCategoryFilterClick = (categoryId) => () => {
    setActiveFilter(categoryId);
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  return (
 <div className="w-full mx-auto ">
      <div className="mb-8 ">
        <h1 className="text-3xl font-bold text-gray-900">Reports</h1>
        <p className="mt-2 text-lg text-gray-600">Explore various reports to gain insights into your organization.</p>
      </div>

      <div className="mb-6 bg-white p-4 rounded-xl border border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-4">
          {categories.map(category => (
            <button
              key={category.id}
              onClick={handleCategoryFilterClick(category.id)}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                activeFilter === category.id
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}>
              {category.name}
            </button>
          ))}
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search reports..."
            value={searchTerm}
            onChange={handleSearchChange}
            className="pl-10 pr-4 py-2 border border-gray-300 rounded-md w-64 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
          />
        </div>
      </div>

      {filteredReports.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredReports.map(report => (
            <ReportCard key={report.id} report={report} />
          ))}
        </div>
      ) : (
        <NoReportsFound onReset={handleResetFilters} />
      )}

      {filteredReports.length > 0 && (
        <div className="mt-8 text-center">
          <p className="text-gray-500 text-sm">
            Showing {filteredReports.length} of {reports.length} reports
          </p>
        </div>
      )}
    </div>
  );
};

ReportList.propTypes = {
  reports: PropTypes.array.isRequired,
  categories: PropTypes.array.isRequired,
};

export { ReportList };