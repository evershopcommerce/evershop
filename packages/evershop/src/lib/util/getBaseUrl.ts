import { normalizePort } from '../../bin/lib/normalizePort.js';
import { getConfig } from './getConfig.js';

/**
 * Environment variable that overrides the configured `shop.homeUrl`. When set,
 * it takes precedence over every config file; when unset (or empty) the store
 * falls back to `shop.homeUrl` and then to `http://localhost:<PORT>`.
 */
export const HOME_URL_ENV = 'EVERSHOP_HOME_URL';

/**
 * Resolve the store's base URL. Precedence (highest first):
 *   1. process.env.EVERSHOP_HOME_URL
 *   2. config `shop.homeUrl`
 *   3. http://localhost:<PORT>
 * Trailing slashes are always stripped.
 */
export function getBaseUrl(): string {
  const port = normalizePort();
  const envUrl = process.env[HOME_URL_ENV]?.trim();
  const baseUrl =
    envUrl || getConfig('shop.homeUrl', `http://localhost:${port}`);
  return baseUrl.replace(/\/+$/, ''); // Remove trailing slashes
}

/**
 * Boot-time guard for the `EVERSHOP_HOME_URL` override. If the variable is set,
 * it must be a valid absolute http(s) URL — otherwise every absolute link and
 * email the store generates would be broken. Throwing here halts boot (the
 * caller in module bootstrap is wrapped in the start/build try/catch that calls
 * `process.exit`). A missing/empty variable is allowed: the store then falls
 * back to `shop.homeUrl`, which the configuration schema validates separately.
 */
export function assertValidHomeUrlEnv(): void {
  const raw = process.env[HOME_URL_ENV];
  if (raw === undefined || raw.trim() === '') {
    return;
  }
  const value = raw.trim();
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error(
      `Invalid ${HOME_URL_ENV}: "${value}" is not a valid URL. ` +
        `Set an absolute URL such as "https://example.com".`
    );
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error(
      `Invalid ${HOME_URL_ENV}: "${value}" must use the http or https protocol.`
    );
  }
}
