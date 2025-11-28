// ReportCard.js
import PropTypes from 'prop-types';
import { NavLink } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { getColorClasses } from '../../utils/colors';

const ReportCard = ({ report }) => {
  const colorClasses = getColorClasses(report.color);
  const Icon = report.icon;

  return (
    <NavLink to={report.slug} className="block group"> 
      <div
        className={`relative p-6 rounded-xl border transition-all duration-300 ease-in-out transform group-hover:-translate-y-1 group-hover:shadow-lg ${colorClasses.border} ${colorClasses.bg}`}
      >
        <div className={`absolute top-0 left-6 w-1 h-full ${colorClasses.accent} rounded-l-xl`}></div>
        <div className="flex items-start gap-4">
          <div className={`flex-shrink-0 w-12 h-12 ml-4 rounded-lg flex items-center justify-center ${colorClasses.iconBg}`}>
            <Icon className={colorClasses.text} size={24} />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-800 text-md mb-1">{report.title}</h3>
            <p className="text-sm text-gray-600 mb-4">{report.desc}</p>
            <div className={`inline-flex items-center gap-1 text-sm font-medium ${colorClasses.text}`}>
              <span>View</span>
              <ChevronRight size={16} className="mt-0.5" />
            </div>
          </div>
        </div>
      </div>
    </NavLink>
  );
};

ReportCard.propTypes = {
  report: PropTypes.shape({
    id: PropTypes.number.isRequired,
    title: PropTypes.string.isRequired,
    slug: PropTypes.string.isRequired,
    desc: PropTypes.string.isRequired,
    category: PropTypes.string.isRequired,
    color: PropTypes.string.isRequired,
    icon: PropTypes.elementType.isRequired,
  
  }).isRequired,
};

export { ReportCard };