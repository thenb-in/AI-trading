import { useEffect, useState } from "react";
import { ensureSocketReady, subscribeSocketStatus } from "../socket/setup";


function SocketStatusIndicator() {
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeSocketStatus(setConnected);
    // The indicator is the socket's first use: without this the connection is
    // only opened when some feature happens to need it (notifications, running
    // a report), so the dot reads red for users who never trigger one.
    // Failures need no handling — the status listener already shows red.
    ensureSocketReady().catch(() => { /* stays red */ });
    return unsubscribe;
  }, []);

  return (
    <span
      title={connected ? "Socket connected" : "Socket not connected"}
      className="relative flex h-2.5 w-2.5 flex-shrink-0"
    >
      <span
        className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
          connected ? "bg-green-400" : "bg-red-400"
        }`}
      />
      <span
        className={`relative inline-flex h-2.5 w-2.5 rounded-full ${
          connected ? "bg-green-500" : "bg-red-500"
        }`}
      />
    </span>
  );
}

export { SocketStatusIndicator };
