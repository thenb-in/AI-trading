// Client socket lifecycle pipeline


import { io } from 'socket.io-client';

const CONNECT_WAIT_MS = 3000;

let _socket = null;
let _opts = null;
let _refCount = 0;


function buildSocket({ url, token }) {
  const target = url || (typeof window !== 'undefined' ? window.location.origin : '/');
  const sock = io(target, {
    withCredentials: true,
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 10000,
    auth: (cb) => cb(token ? { token: typeof token === 'function' ? token() : token } : {}),
  });
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
}


function disconnectSocket() {
  console.info('[socket] disconnectSocket() called, was isSocketConnected=' + isSocketConnected());
  _refCount = 0;
  _teardownSocket();
}

// Per-call release: tear down only once the last in-flight caller is done.
function releaseSocket() {
  _refCount = Math.max(0, _refCount - 1);
  if (_refCount === 0) {
    _teardownSocket();
  }
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
    const onError = (err) => { cleanup(); reject(new Error(err?.message || 'CONNECT_ERROR')); };
    const timer = setTimeout(() => { cleanup(); reject(new Error('SOCKET_NOT_CONNECTED')); }, CONNECT_WAIT_MS);
    socket.once('connect', onConnect);
    socket.once('connect_error', onError);
  });
}

async function ensureSocketReady() {
  console.info('[socket] ensureSocketReady() entry, isSocketConnected=' + isSocketConnected());
  _refCount += 1;
  const socket = getSocket();
  await waitForConnect(socket);
  return socket;
}

export { disconnectSocket, releaseSocket, ensureSocketReady };
