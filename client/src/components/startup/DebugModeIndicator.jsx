import PropTypes from 'prop-types';

/**
 * Presentational debug mode indicator (DEBUG label + D badge).
 * Parent is responsible for rendering only when debug mode is on.
 */
function DebugModeIndicator({ collapsed }) {
  return (
    <div className={`${collapsed ? 'p-2' : 'p-3'} border-b border-gray-600 mb-2`}>
      <div className={`flex items-center justify-center ${collapsed ? 'text-xs' : 'text-sm'} text-yellow-400 font-bold`}>
        {!collapsed && <span className="mr-1">DEBUG</span>}
        <span className="bg-yellow-400 text-gray-800 rounded-full w-4 h-4 flex items-center justify-center text-xs font-bold">
          D
        </span>
      </div>
    </div>
  );
}

DebugModeIndicator.propTypes = {
  collapsed: PropTypes.bool.isRequired,
};

export { DebugModeIndicator };
