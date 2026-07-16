'use strict';

const { startSso, ssoCallback, ssoBackchannelLogout } = require('./ssoView');
const { buildEndSessionUrl, isSsoConfigured } = require('./engine/oidcClient');
const { findIdentityLinkByUserId } = require('../services/identityLinkService');

module.exports = {
  startSso,
  ssoCallback,
  ssoBackchannelLogout,
  buildEndSessionUrl,
  isSsoConfigured,
  findIdentityLinkByUserId
};
