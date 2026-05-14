import PropTypes from 'prop-types';
import { Loader2 } from 'lucide-react';


const BusyOverlay = ({ isApplyingFilters }) => (
  <div className="absolute inset-0 bg-white/90 backdrop-blur-sm rounded-xl z-50 flex items-center justify-center">
    <div className="flex flex-col items-center gap-3 p-6 bg-white rounded-xl shadow-xl border-2 border-blue-200">
      <div className="relative">
        <Loader2 size={32} className="animate-spin text-blue-600" />
        <div className="absolute inset-0 rounded-full border-2 border-blue-100"></div>
      </div>
      <div className="text-center">
        <p className="text-sm font-semibold text-gray-900 mb-1">
          {isApplyingFilters ? 'Applying Filters' : 'Loading Filters'}
        </p>
        <p className="text-xs text-gray-500">Please wait...</p>
      </div>
    </div>
  </div>
);

BusyOverlay.propTypes = {
  isApplyingFilters: PropTypes.bool,
};

export { BusyOverlay };
