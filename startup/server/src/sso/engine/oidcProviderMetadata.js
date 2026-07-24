'use strict';

const logger = require('../../../logger');
const env = require('../../config/env');

const PROVIDER_METADATA_TTL_MS = 10 * 60 * 1000;
let cachedMetadata = null;
let cachedMetadataAt = 0;


// Fetch (and cache) the issuer's OpenID Provider Metadata.
async function getOidcProviderMetadata() {

  if (!env.OIDC_ISSUER || !env.APP_KEY || !env.OIDC_REDIRECT_URI) {
    throw { status: 503, message: 'OIDC client is not configured' };
  }
  if (cachedMetadata && Date.now() - cachedMetadataAt < PROVIDER_METADATA_TTL_MS) {
    return cachedMetadata;
  }
  const issuer = env.OIDC_ISSUER.replace(/\/$/, '');
  const url = `${issuer}/.well-known/openid-configuration`;
  logger.info(`[oidc-rp] Fetching provider metadata ${url}`);
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`OIDC provider metadata fetch failed: ${res.status}`);
  }
  cachedMetadata = await res.json();
  cachedMetadataAt = Date.now();
  return cachedMetadata;
}

module.exports = { getOidcProviderMetadata };
