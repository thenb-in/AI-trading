import PropTypes from "prop-types";
import { NotificationGroups } from "./NotificationGroups";
import { EmptyState } from "./EmptyState";
import { notificationShape } from "../notificationShape";

// Scrollable body of the bell panel: the shared grouped list, or an empty state.
function NotificationList({ groups, onMarkRead, onNavigate }) {
  const isEmpty = groups.every((group) => group.entries.length === 0);

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      {isEmpty ? (
        <EmptyState />
      ) : (
        <NotificationGroups groups={groups} onMarkRead={onMarkRead} onNavigate={onNavigate} />
      )}
    </div>
  );
}

NotificationList.propTypes = {
  groups: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string.isRequired,
      entries: PropTypes.arrayOf(notificationShape).isRequired,
    })
  ).isRequired,
  onMarkRead: PropTypes.func.isRequired,
  onNavigate: PropTypes.func,
};

export { NotificationList };
