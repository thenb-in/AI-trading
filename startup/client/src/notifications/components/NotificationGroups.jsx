import PropTypes from "prop-types";
import { NotificationItem } from "./NotificationItem";
import { notificationShape } from "../notificationShape";


function NotificationGroups({ groups, onMarkRead }) {
  return groups.map(({ label, entries }) => (
    <section key={label}>
      <h4 className="sticky top-0 z-10 bg-gray-50/95 px-5 py-2 text-xs font-semibold uppercase tracking-wide text-gray-500 backdrop-blur">
        {label}
      </h4>
      <ul className="divide-y divide-gray-100">
        {entries.map((item) => (
          <NotificationItem key={item.id} item={item} onMarkRead={onMarkRead} />
        ))}
      </ul>
    </section>
  ));
}

NotificationGroups.propTypes = {
  groups: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string.isRequired,
      entries: PropTypes.arrayOf(notificationShape).isRequired,
    })
  ).isRequired,
  onMarkRead: PropTypes.func.isRequired,
};

export { NotificationGroups };
