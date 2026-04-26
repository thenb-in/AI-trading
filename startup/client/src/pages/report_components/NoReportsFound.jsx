import PropTypes from 'prop-types';
import { Search } from 'lucide-react';

const NoReportsFound = ({ onReset }) => {
  return (
    <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
      <div className="text-gray-400 mb-4">
        <Search size={48} className="mx-auto" />
      </div>
      <h3 className="text-lg font-medium text-gray-900 mb-2">No matching reports found</h3>
      <p className="text-gray-600 max-w-md mx-auto">
        We couldn&apos;t find any reports matching your search criteria. Try adjusting your filters or search terms.
      </p>
      <button 
        onClick={onReset}
        className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
      >
        Reset filters
      </button>
    </div>
  );
};

NoReportsFound.propTypes = {
  onReset: PropTypes.func.isRequired,
};

export { NoReportsFound };