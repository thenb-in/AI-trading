import { memo } from "react";
import PropTypes from "prop-types";
import { Lock } from "lucide-react";

const EmptyState = ({ searchTerm }) => {
  const message = searchTerm.length >= 2
    ? "No modules found"
    : "No modules available";

  return (
    <div className="text-center py-12 flex flex-col items-center gap-4">
      <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center">
        <Lock size={32} className="text-gray-400" />
      </div>
      <p className="text-base text-gray-600 font-medium">{message}</p>
    </div>
  );
};

EmptyState.propTypes = {
  searchTerm: PropTypes.string.isRequired,
};

const MemoizedEmptyState = memo(EmptyState);
export { MemoizedEmptyState as EmptyState };

