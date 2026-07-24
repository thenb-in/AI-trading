// Client socket lifecycle pipeline
//
// Connect-once model: the socket is created lazily on first use and stays
// alive for the whole session (socket.io auto-reconnects on drops). It is
// only torn down by disconnectSocket() on logout.


import { io } from 'socket.io-client';

const CONNECT_WAIT_MS = 5000;

let _socket = null;
let _opts = null;

const _statusListeners = new Set();

function _notifyStatus() {
  const connected = isSocketConnected();
  _statusListeners.forEach((listener) => {
    try { listener(connected); } catch { /* listener error */ }
  });
}

// Subscribe to connect/disconnect changes; calls back immediately with the
// current status and returns an unsubscribe function.
function subscribeSocketStatus(listener) {
  _statusListeners.add(listener);
  listener(isSocketConnected());
  return () => _statusListeners.delete(listener);
}


function buildSocket({ url, token }) {
  const target = url || (typeof window !== 'undefined' ? window.location.origin : '/');
  const sock = io(target, {
    withCredentials: true,
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 10000,
    auth: (cb) => cb(token ? { token: typeof token === 'function' ? token() : token } : {}),
  });
  sock.on('connect', _notifyStatus);
  sock.on('disconnect', _notifyStatus);
  sock.on('connect_error', _notifyStatus);
  if (typeof window !== 'undefined') {
    sock.on('connect', () => console.info('[socket] connected id=' + sock.id + ' isSocketConnected=' + isSocketConnected()));
    sock.on('connect_error', (err) => console.warn('[socket] connect_error:', err?.message || err, ' isSocketConnected=' + isSocketConnected()));
    sock.on('disconnect', (reason) => console.info('[socket] disconnect reason=' + reason + ' isSocketConnected=' + isSocketConnected()));
  }
  return sock;
}


function getSocket(opts = {}) {
  if (_socket) return _socket;
  _opts = opts;
  _socket = buildSocket(_opts);
  return _socket;
}

function isSocketConnected() {
  return Boolean(_socket?.connected);
}

function _teardownSocket() {
  if (!_socket) return;
  try { _socket.disconnect(); } catch { /* already gone */ }
  _socket = null;
  _opts = null;
  _notifyStatus();
}


function disconnectSocket() {
  console.info('[socket] disconnectSocket() called, was isSocketConnected=' + isSocketConnected());
  _teardownSocket();
}


function waitForConnect(socket) {
  if (socket.connected) return Promise.resolve();
  try { socket.connect(); } catch { /* noop */ }
  return new Promise((resolve, reject) => {
    const cleanup = () => {
      socket.off('connect', onConnect);
      socket.off('connect_error', onError);
      clearTimeout(timer);
    };
    const onConnect = () => { cleanup(); resolve(); };
    const onError = (err) => {
      cleanup();
      reject(new Error(`Could not connect to the report server${err?.message ? ` (${err.message})` : ''}. Please try again.`));
    };
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error(`Report server did not respond within ${CONNECT_WAIT_MS / 1000}s. It may be down or unreachable — please try again.`));
    }, CONNECT_WAIT_MS);
    socket.once('connect', onConnect);
    socket.once('connect_error', onError);
  });
}

async function ensureSocketReady() {
  console.info('[socket] ensureSocketReady() entry, isSocketConnected=' + isSocketConnected());
  const socket = getSocket();
  await waitForConnect(socket);
  return socket;
}

export { disconnectSocket, ensureSocketReady, subscribeSocketStatus };
