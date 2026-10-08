import { getSetting } from '../../setting/services/setting.js';
import {
  DEFAULT_LOG_LIMIT,
  MAX_LOG_LIMIT,
  MIN_LOG_LIMIT
} from './constants.js';

export const LOG_LIMIT_SETTING = 'webhookLogLimit';

/**
 * Clamp the `webhookLogLimit` setting. The generic settings API accepts any
 * value for any key, so the bounds are enforced here, at read time.
 */
export function clampLogLimit(value: unknown): number {
  const parsed = typeof value === 'number' ? value : parseInt(String(value), 10);
  if (!Number.isFinite(parsed)) {
    return DEFAULT_LOG_LIMIT;
  }
  return Math.min(MAX_LOG_LIMIT, Math.max(MIN_LOG_LIMIT, Math.trunc(parsed)));
}

export async function getLogLimit(): Promise<number> {
  return clampLogLimit(await getSetting(LOG_LIMIT_SETTING, DEFAULT_LOG_LIMIT));
}
