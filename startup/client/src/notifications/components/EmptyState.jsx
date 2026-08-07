import PropTypes from "prop-types";
import { Bell } from "lucide-react";


function EmptyState({ title = "You're all caught up", description = "No new notifications" }) {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
      <Bell className="h-8 w-8 text-gray-300" />
      <p className="mt-2 text-sm font-medium text-gray-500">{title}</p>
      {description && <p className="text-xs text-gray-400">{description}</p>}
    </div>
  );
}

EmptyState.propTypes = {
  title: PropTypes.string,
  description: PropTypes.string,
};

export { EmptyState };
