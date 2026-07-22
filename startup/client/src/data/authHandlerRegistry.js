let appLoginHandlers = [];
let appLogoutHandlers = [];

const runAll = (handlers, ...args) => {
  handlers.forEach((handler) => {
    if (typeof handler === 'function') handler(...args);
  });
};

const registerAppLoginHandlers = (handlers) => {
  appLoginHandlers = Array.isArray(handlers) ? handlers : [];
};

const registerAppLogoutHandlers = (handlers) => {
  appLogoutHandlers = Array.isArray(handlers) ? handlers : [];
};

const runAppLoginHandlers = (user) => runAll(appLoginHandlers, user);
const runAppLogoutHandlers = () => runAll(appLogoutHandlers);

export {
  registerAppLoginHandlers,
  registerAppLogoutHandlers,
  runAppLoginHandlers,
  runAppLogoutHandlers,
};
