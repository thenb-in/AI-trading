import { useState, useMemo } from 'react';
import PropTypes from 'prop-types';
import { Search } from 'lucide-react';
import { ReportCard } from './ReportCard';
import { NoReportsFound } from './NoReportsFound';
import { hasPermission, useDataContext } from '@context/useDataContext';
import { getModulePermissionName } from '@data/getModulePermissionName';
import { SearchTypeField } from '@startup/components/base_components/fields/SearchTypeField';

const ReportList = ({ reports, categories }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const dataContext = useDataContext();

  const filteredReports = useMemo(() => {
    return reports.filter(report => {
      const matchesFilter = activeFilter === 'all' || report.category === activeFilter;
      const matchesSearch = report.title.toLowerCase().includes(searchTerm.toLowerCase());
      const permissionName = getModulePermissionName(report);
      const isPermissionGranted = hasPermission(permissionName, dataContext);
      if (!isPermissionGranted) {
        // console.log(`No permission for ${permissionName}`, report);
      }
      return matchesFilter && matchesSearch && isPermissionGranted;
    });
  }, [reports, searchTerm, activeFilter, dataContext]);

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
    <div className="w-full mx-auto">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">Reports</h1>
        <p className="mt-1 sm:mt-2 text-sm sm:text-base lg:text-lg text-gray-600">
          Explore various reports to gain insights into your organization.
        </p>
      </div>

      <div className="mb-6 bg-white p-3 sm:p-4 rounded-xl border border-gray-200 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <div className="w-full lg:w-auto order-2 lg:order-1">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-1 px-1 lg:flex-wrap lg:overflow-visible lg:pb-0 lg:mx-0 lg:px-0">
            {categories.map(category => (
              <button
                key={category.id}
                onClick={handleCategoryFilterClick(category.id)}
                className={`flex-shrink-0 px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium rounded-md transition-colors whitespace-nowrap ${
                  activeFilter === category.id
                    ? 'bg-gray-900 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}>
                {category.name}
              </button>
            ))}
          </div>
        </div>
        <div className="w-full lg:w-64 order-1 lg:order-2">
          <SearchTypeField
            icon={<Search className="w-4 h-4 text-gray-400" />}
            placeholder="Search reports..."
            value={searchTerm}
            onChange={handleSearchChange}
            className="w-full"
          />
        </div>
      </div>

      {filteredReports.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {filteredReports.map(report => (
            <ReportCard key={report.id} report={report} />
          ))}
        </div>
      ) : (
        <NoReportsFound onReset={handleResetFilters} />
      )}

      {filteredReports.length > 0 && (
        <div className="mt-6 sm:mt-8 text-center">
          <p className="text-gray-500 text-xs sm:text-sm">
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