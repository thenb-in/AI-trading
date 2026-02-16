import { memo } from "react";
import PropTypes from "prop-types";
import { Lock, LockOpen } from "lucide-react";

const COLOR_CLASSES = {
  info: "from-cyan-600 to-blue-800",
  warning: "from-orange-600 to-orange-800",
  primary: "from-blue-600 to-blue-800",
  success: "from-green-600 to-green-800",
  secondary: "from-purple-600 to-purple-800",
  error: "from-red-600 to-red-800",
  blue: "from-blue-500 to-blue-700",
  indigo: "from-indigo-600 to-indigo-800",
  purple: "from-purple-600 to-purple-800",
  green: "from-green-500 to-green-700",
  yellow: "from-yellow-500 to-yellow-600",
  red: "from-red-500 to-red-700",
  teal: "from-teal-500 to-teal-700",
  orange: "from-orange-500 to-orange-700",
};

const ModuleCard = ({ module, type, onClick }) => {
  const Icon = module.icon;
  const isDisabled = !module.hasAccess;
  const colorKey = module.color || (type === "master" ? "primary" : "secondary");
  const gradientClass = COLOR_CLASSES[colorKey] || COLOR_CLASSES.primary;

  const handleClick = () => {
    if (!isDisabled && onClick) {
      onClick();
    }
  };

  const handleKeyPress = (e) => {
    if ((e.key === "Enter" || e.key === " ") && !isDisabled && onClick) {
      e.preventDefault();
      onClick();
    }
  };

  return (
    <div
      className={`
        h-full transition-all duration-200 ease-in-out
        border rounded-lg relative overflow-hidden
        ${isDisabled
          ? "cursor-not-allowed opacity-50 bg-gray-50 border-gray-300"
          : "cursor-pointer bg-white border-gray-200 hover:shadow-md hover:border-gray-300"
        }
      `}
      onClick={handleClick}
      onKeyPress={handleKeyPress}
      role="button"
      tabIndex={isDisabled ? -1 : 0}
      aria-disabled={isDisabled}
      title={isDisabled ? `Access denied. Required permission: ${module.permissionName}` : undefined}
    >
      {/* Top gradient bar */}
      {!isDisabled && (
        <div className={`absolute top-0 left-0 right-0 h-px bg-gradient-to-r ${gradientClass} opacity-60`} />
      )}

      <div className="p-2.5 h-full flex flex-col gap-1.5">
        <div className="flex items-center gap-2.5">
          <div className={`
            p-2 rounded flex items-center justify-center
            min-w-[28px] min-h-[28px] flex-shrink-0
            ${isDisabled
              ? "bg-gradient-to-br from-gray-400 to-gray-500"
              : `bg-gradient-to-br ${gradientClass}`
            }
          `}>
            {type === "master" ? (
              <Icon className="w-3.5 h-3.5 text-white" />
            ) : (
              <Icon size={14} className="text-white" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-0.5">
              <h3 className={`
                text-xs font-medium flex-1
                overflow-hidden text-ellipsis whitespace-nowrap
                ${isDisabled ? "text-gray-400" : "text-gray-900"}
              `}>
                {module.title}
              </h3>
              <div className="flex-shrink-0 ml-1">
                {isDisabled ? (
                  <Lock size={10} className="text-gray-400" />
                ) : (
                  <LockOpen size={10} className="text-green-600" />
                )}
              </div>
            </div>

            {/* Category badge below title */}
            <span className={`
              text-[10px] font-medium px-1.5 py-0.5 rounded-full inline-block
              ${isDisabled
                ? "bg-gray-200 text-gray-500"
                : "bg-gray-100 text-gray-600"
              }
            `}>
              {module.category || "Uncategorized"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

ModuleCard.propTypes = {
  module: PropTypes.shape({
    icon: PropTypes.elementType.isRequired,
    title: PropTypes.string.isRequired,
    description: PropTypes.string,
    desc: PropTypes.string,
    hasAccess: PropTypes.bool.isRequired,
    permissionName: PropTypes.string.isRequired,
    color: PropTypes.string,
    category: PropTypes.string,
  }).isRequired,
  type: PropTypes.oneOf(["master", "report"]).isRequired,
  onClick: PropTypes.func,
};

const MemoizedModuleCard = memo(ModuleCard);
export { MemoizedModuleCard as ModuleCard };

