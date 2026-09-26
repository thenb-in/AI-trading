// What runs when a login is deactivated, so an app can let go of what that user held.
const handlers = [];

function onUserDeactivate(fn) {
  handlers.push(fn);
}

async function runOnUserDeactivate(userId) {
  for (const handler of handlers) {
    await handler(userId);
  }
}

module.exports = { onUserDeactivate, runOnUserDeactivate };
