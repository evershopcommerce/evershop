import { normalizePort } from '../../bin/lib/normalizePort.js';
import { getConfig } from './getConfig.js';

export function getBaseUrl(): string {
  const port = normalizePort();
  const baseUrl = getConfig('shop.homeUrl', `http://localhost:${port}`);
  return baseUrl.replace(/\/+$/, ''); // Remove trailing slashes
}
