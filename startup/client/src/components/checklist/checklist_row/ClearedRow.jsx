import PropTypes from 'prop-types';
import { CheckCircle2 } from 'lucide-react';

const ClearedRow = ({ title, clearedMessage, checkedCount, windowLabel, showStatusStripe }) => (
  <div className={`relative py-3 pr-5 flex items-center gap-3 text-xs bg-emerald-50/30 ${showStatusStripe ? 'pl-6' : 'pl-5'}`}>
    {showStatusStripe && <span className="absolute inset-y-0 left-0 w-1 bg-emerald-400" aria-hidden="true" />}
    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
    <span className="text-gray-600 truncate">{title}</span>
    {windowLabel && <span className="text-gray-500 shrink-0">{`· ${windowLabel}`}</span>}
    <span className="ml-auto text-right shrink-0 font-medium text-emerald-700">
      {clearedMessage}
      {checkedCount > 0 && <span className="font-normal text-gray-500 tabular-nums">{` · ${checkedCount} checked`}</span>}
    </span>
  </div>
);

ClearedRow.propTypes = {
  title: PropTypes.string.isRequired,
  clearedMessage: PropTypes.string.isRequired,
  checkedCount: PropTypes.number,
  windowLabel: PropTypes.string,
  showStatusStripe: PropTypes.bool
};

export { ClearedRow };
