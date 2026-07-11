import { formatRelativeTime, getDayGroupLabel } from "@utils/dateTimeUtils";
import { DEFAULT_VARIANT, DEFAULT_GROUP_LABEL } from "./constants";


function normalizeNotification(payload) {
  return {
    id: String(payload.id),
    companyId: payload.companyId || null,
    variant: payload.variant || DEFAULT_VARIANT,
    title: payload.title,
    message: payload.message,
    read: Boolean(payload.read),
    createdAt: payload.createdAt || null,
    time: formatRelativeTime(payload.createdAt),
    group: getDayGroupLabel(payload.createdAt, DEFAULT_GROUP_LABEL),
  };
}

export { normalizeNotification };
