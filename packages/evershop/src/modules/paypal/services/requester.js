import axios from 'axios';
import { getConfig } from '../../../lib/util/getConfig.js';
import { getSetting } from '../../setting/services/setting.js';
import { getApiBaseUrl } from './getApiBaseUrl.js';

// Tokens are cached per (environment, clientId) so switching sandbox/live or
// rotating credentials takes effect on the next request instead of after the
// old token's ~9h lifetime.
export function buildTokenCacheKey(baseUrl, clientId) {
  return `${baseUrl}::${clientId}`;
}

// A token is reused only while it has at least 60s of lifetime left, so it
// can't expire between the cache check and the PayPal call.
export function isTokenValid(tokenObj, now = Date.now()) {
  if (!tokenObj) {
    return false;
  }
  return now - tokenObj.created_at < (tokenObj.expires_in - 60) * 1000;
}

async function getPaypalCredentials() {
  const paypalConfig = getConfig('system.paypal', {});
  const clientId =
    paypalConfig.clientId || (await getSetting('paypalClientId', ''));
  const clientSecret =
    paypalConfig.clientSecret || (await getSetting('paypalClientSecret', ''));
  return { clientId, clientSecret };
}

export async function createAxiosInstance(request) {
  const baseURL = await getApiBaseUrl();
  const axiosInstance = axios.create({
    baseURL,
    headers: {
      'Content-Type': 'application/json'
    }
  });

  axiosInstance.interceptors.request.use(async (config) => {
    const { clientId, clientSecret } = await getPaypalCredentials();
    const cacheKey = buildTokenCacheKey(baseURL, clientId);
    const locals = request.app.locals;
    locals.paypalAccessTokens = locals.paypalAccessTokens || {};
    let tokenObj = locals.paypalAccessTokens[cacheKey];
    if (!isTokenValid(tokenObj)) {
      const paypalAccessToken = await requestAccessToken(
        baseURL,
        clientId,
        clientSecret
      );
      tokenObj = {
        access_token: paypalAccessToken.data.access_token,
        expires_in: paypalAccessToken.data.expires_in,
        created_at: Date.now()
      };
      locals.paypalAccessTokens[cacheKey] = tokenObj;
    }
    config.headers.Authorization = `Bearer ${tokenObj.access_token}`;
    return config;
  });
  return axiosInstance;
}

// For callers with no request in scope (webhook, cron, hooks). The
// module-level context keeps the token cache warm across invocations within
// the process.
const standaloneContext = { app: { locals: {} } };
export function createStandaloneAxiosInstance() {
  return createAxiosInstance(standaloneContext);
}

async function requestAccessToken(baseUrl, clientId, clientSecret) {
  const params = new URLSearchParams({ grant_type: 'client_credentials' });
  const paypalAccessToken = await axios.post(
    `${baseUrl}/v1/oauth2/token`,
    params,
    {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${Buffer.from(
          `${clientId}:${clientSecret}`
        ).toString('base64')}`
      }
    }
  );
  return paypalAccessToken;
}
