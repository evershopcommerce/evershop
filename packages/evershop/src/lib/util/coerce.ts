/**
 * Coercion helpers for admin `setting` values.
 *
 * The `setting` table stores every scalar as TEXT (see
 * `modules/setting/api/saveSetting/saveSetting.js`), so `getSetting` / `getSettingSync` return
 * raw strings for a warm cache (`"true"`, `"20"`, `"ceil"`). The config fallback they return on
 * a cold cache, however, is already a real boolean / number. These helpers normalise BOTH shapes
 * to the correct runtime type so callers never accidentally compare against a stray string
 * (e.g. `"false" === false`).
 */

export function toBoolean(value: unknown): boolean {
  if (typeof value === 'boolean') {
    return value;
  }
  return ['1', 'true', 'yes', 'on'].includes(String(value).trim().toLowerCase());
}

export function toInt(value: unknown, fallback: number): number {
  const parsed =
    typeof value === 'number' ? value : parseInt(String(value), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function toFloat(value: unknown, fallback: number): number {
  const parsed =
    typeof value === 'number' ? value : parseFloat(String(value));
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function toEnum<T extends string>(
  value: unknown,
  allowed: readonly T[],
  fallback: T
): T {
  const candidate = String(value) as T;
  return allowed.includes(candidate) ? candidate : fallback;
}
