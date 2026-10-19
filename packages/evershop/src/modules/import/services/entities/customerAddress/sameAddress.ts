import type { StoredAddress } from '../../ports/lookup.js';
import { ADDRESS_VALUE_COLUMNS } from './customerAddressValidator.js';

// Key order does not matter, and `{}` is the same as nothing.
function stable(value: Record<string, unknown> | null | undefined): string {
  if (!value || Object.keys(value).length === 0) {
    return '';
  }
  return JSON.stringify(
    Object.fromEntries(
      Object.entries(value).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    )
  );
}

/**
 * Whether a stored address is the one a row would add, once the row has been
 * through the normalization seam: the same text in every shared column (a column
 * the row leaves out is empty) and the same extras. `is_default` is not part of
 * it: a later address may have taken the flag since. Used when a job is resumed,
 * because an address is only ever added (D-18) and the worker that died may have
 * added the ones after the last place it saved.
 */
export function sameAddress(
  stored: StoredAddress,
  normalized: Record<string, unknown>
): boolean {
  for (const column of ADDRESS_VALUE_COLUMNS) {
    const value = normalized[column];
    const text = value === undefined || value === null ? '' : String(value);
    if ((stored.fields[column] ?? '') !== text) {
      return false;
    }
  }
  return (
    stable(stored.extra) ===
    stable(normalized.extra as Record<string, unknown> | undefined)
  );
}
