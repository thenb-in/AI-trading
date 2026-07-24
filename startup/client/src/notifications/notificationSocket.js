import { ensureSocketReady } from "../socket/setup";
import { NOTIFICATION_NEW } from "../constants/notifications";


async function subscribeToNotifications(onNew) {
  const socket = await ensureSocketReady();
  socket.on(NOTIFICATION_NEW, onNew);

  return () => {
    socket.off(NOTIFICATION_NEW, onNew);
  };
}

export { subscribeToNotifications };
