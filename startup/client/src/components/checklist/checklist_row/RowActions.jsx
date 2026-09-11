import PropTypes from 'prop-types';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, FileSpreadsheet } from 'lucide-react';
import { buildReportPath } from '../useChecklistData';


const RowActions = ({ result }) => {
  const navigate = useNavigate();
  const reportPath = buildReportPath(result.report);

  const goTo = (path) => (event) => {
    event.stopPropagation();
    navigate(path);
  };

  return (
    <div className="flex items-center gap-2 shrink-0 pt-0.5">
      {reportPath && (
        <button
          type="button"
          onClick={goTo(reportPath)}
          className="flex w-[92px] items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900"
        >
          <FileSpreadsheet className="h-3.5 w-3.5" />
          Report
        </button>
      )}
      {result.fix?.path && (
        <button
          type="button"
          onClick={goTo(result.fix.path)}
          className="group flex w-[168px] items-center justify-between gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-800 shadow-sm transition-colors hover:border-gray-400 hover:bg-gray-50"
        >
          <span className="truncate">{result.fix.label}</span>
          <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
        </button>
      )}
    </div>
  );
};

RowActions.propTypes = {
  result: PropTypes.object.isRequired
};

export { RowActions };
