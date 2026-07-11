let handler = null;

function onUserUpdate(fn) {
  handler = fn;
}

async function runOnUserUpdate(data) {
  if (handler) {
    await handler(data);
  }
}

module.exports = { onUserUpdate, runOnUserUpdate };
