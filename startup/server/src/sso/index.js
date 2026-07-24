'use strict';

const { startSso, ssoCallback, ssoBackchannelLogout } = require('./ssoView');
const { buildEndSessionUrl } = require('./engine/oidcClient');

module.exports = {
  startSso,
  ssoCallback,
  ssoBackchannelLogout,
  buildEndSessionUrl
};
