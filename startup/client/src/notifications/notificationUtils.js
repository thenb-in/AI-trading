import { DEFAULT_GROUP_LABEL } from "./constants";

// Number of unread notifications in a list.
function countUnread(items) {
  return items.filter((item) => !item.read).length;
}

// Bucket notifications by their `group` label while preserving the order in
// which each label first appears (e.g. "Today" before "Earlier").
function groupNotifications(items) {
  return items.reduce((groups, item) => {
    const label = item.group || DEFAULT_GROUP_LABEL;
    let bucket = groups.find((group) => group.label === label);
    if (!bucket) {
      bucket = { label, entries: [] };
      groups.push(bucket);
    }
    bucket.entries.push(item);
    return groups;
  }, []);
}

export { countUnread, groupNotifications };
