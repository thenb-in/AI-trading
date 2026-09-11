import PropTypes from 'prop-types';
import { AlertTriangle, Send, UserCheck } from 'lucide-react';

const AudienceSummary = ({ summary, onlyTheSubject }) => {
  if (!summary && !onlyTheSubject) {
    return (
      <div className="flex items-center gap-2 border-b border-amber-200 bg-amber-50 px-4 py-2.5">
        <AlertTriangle className="h-4 w-4 flex-shrink-0 text-amber-600" />
        <p className="text-sm font-semibold text-amber-800">
          Nobody picked — this rule will not send anything.
        </p>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="flex items-center gap-2 border-b border-blue-200 bg-blue-50 px-4 py-2.5">
        <UserCheck className="h-4 w-4 flex-shrink-0 text-blue-600" />
        <p className="text-sm font-semibold text-blue-800">
          Each message goes to the person it is about.
        </p>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 border-b border-emerald-200 bg-emerald-50 px-4 py-2.5">
      <Send className="h-4 w-4 flex-shrink-0 text-emerald-600" />
      <p className="text-sm text-emerald-900">
        Goes to <span className="font-bold">{summary}</span>
        {onlyTheSubject && <span className="font-semibold"> — each one only their own</span>}
      </p>
    </div>
  );
};

AudienceSummary.propTypes = {
  summary: PropTypes.string,
  onlyTheSubject: PropTypes.bool
};

export { AudienceSummary };
