import { getAddressFormat } from '../../../../../lib/address/formats.js';
import { normalizeNameParts } from '../../../../../lib/address/names.js';
import { getAddressRuntime } from '../../../../../lib/address/runtime.js';
import type { Address } from '../../../../../types/address.js';

/**
 * The normalization seam (spec § 3.8, § 3.12). Registered from the customer
 * module's bootstrap at priority 0 on `customerAddressDataBeforeCreate`,
 * `customerAddressDataBeforeUpdate` and `cartAddressDataBeforeSave`, so it
 * runs before `validateAddress`, which never mutates:
 *
 *   1. every string value is trimmed; `country` is upper-cased;
 *   2. `telephone` is stored in E.164 form using the record's `dialCode`
 *      (`normalizeTelephone`);
 *   3. names follow § 3.12: parts present and `recipient` absent → compose in
 *      the record's `name_order`; split mode recomposes `recipient` from the
 *      parts; editing `recipient` directly in single mode clears the parts so
 *      the two can never disagree (`normalizeNameParts`).
 *
 * `this` is the processor context: `previous` carries the stored row on
 * update (the services put it there), `type` the cart surface.
 */

/** Countries whose numbering plan keeps the leading 0 inside the national number. */
const KEEP_TRUNK_ZERO = new Set(['IT', 'SM', 'VA']);

const SEPARATORS = /[\s().-]/g;

/**
 * E.164 (`+<dial code><national number>`, digits only) when the value is a
 * plain number: separators are removed, `00` becomes `+`, and a national
 * number gains the record's dial code with its trunk `0` dropped (kept for
 * Italy's plan). Anything that is not made of digits and separators, or a
 * country without a known dial code, is left as typed (trimmed) for the
 * validator to judge.
 */
export function normalizeTelephone(telephone: unknown, country: string): unknown {
  if (typeof telephone !== 'string') {
    return telephone;
  }
  const trimmed = telephone.trim();
  if (trimmed === '') {
    return trimmed;
  }
  if (trimmed.startsWith('+')) {
    const rest = trimmed.slice(1);
    return /^[0-9\s().-]+$/.test(rest) ? `+${rest.replace(SEPARATORS, '')}` : trimmed;
  }
  if (!/^[0-9\s().-]+$/.test(trimmed)) {
    return trimmed;
  }
  let digits = trimmed.replace(SEPARATORS, '');
  if (digits.startsWith('00')) {
    return `+${digits.slice(2)}`;
  }
  const cc = country.trim().toUpperCase();
  const dialCode = getAddressFormat(cc).telephone?.dialCode?.replace(/^\+/, '');
  if (!dialCode) {
    return trimmed;
  }
  if (!KEEP_TRUNK_ZERO.has(cc) && digits.startsWith('0')) {
    digits = digits.replace(/^0/, '');
  }
  return `+${dialCode}${digits}`;
}

export function normalizeAddressInput(
  this: Record<string, unknown> | undefined,
  input: Address
): Address {
  if (!input || typeof input !== 'object') {
    return input;
  }
  const previous = (this?.previous ?? undefined) as Address | undefined;
  const next: Address = { ...input };

  for (const [key, value] of Object.entries(next)) {
    if (typeof value === 'string') {
      next[key] = value.trim();
    }
  }
  if (typeof next.country === 'string') {
    next.country = next.country.toUpperCase();
  }

  const country =
    (typeof next.country === 'string' && next.country) ||
    String(previous?.country ?? '').toUpperCase();
  const record = getAddressFormat(country);

  if (next.telephone !== undefined) {
    next.telephone = normalizeTelephone(next.telephone, country) as
      | string
      | null;
  }

  return normalizeNameParts(next, {
    nameFormat: getAddressRuntime().getSettings().nameFormat,
    nameOrder: record.name_order ?? 'given_first',
    previous
  });
}
