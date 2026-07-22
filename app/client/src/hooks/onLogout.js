import { disconnectSocket } from '@startup/socket';


function onLogout() {
  disconnectSocket();
}

export { onLogout };
