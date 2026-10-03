/**
 * The recipient name and its parts (spec § 3.12).
 *
 * `recipient` is canonical and always populated; `given_name` and
 * `family_name` are optional parts collected when the store runs in split
 * mode. Composition follows the record's `name_order`. Nothing here ever
 * invents parts from a recipient except `splitNameFallback`, which is lossy,
 * labelled as such, and reserved for integrations.
 */
import type { AddressRow, NameOrder } from './types.js';

export interface NameParts {
  givenName?: string | null;
  familyName?: string | null;
}

export interface NormalizeNamePartsOptions {
  /** The store's `address.nameFormat` setting (§ 3.13). */
  nameFormat: 'single' | 'split';
  /** The record's `name_order`; drives composition. */
  nameOrder: NameOrder;
  /** The stored row on update. Absent on create. */
  previous?: AddressRow;
}

function textOf(value: unknown): string {
  if (value === undefined || value === null) {
    return '';
  }
  return typeof value === 'string' ? value.trim() : String(value).trim();
}

/**
 * Join the trimmed parts with one space in the record's order: `family_first`
 * puts the family name first (Nguyễn Văn A, 山田 太郎), `given_first` the given
 * name (Jane Smith). A missing part yields the other alone; both missing → ''.
 */
export function composeRecipient(
  parts: NameParts,
  nameOrder: NameOrder
): string {
  const given = textOf(parts.givenName);
  const family = textOf(parts.familyName);
  const ordered = nameOrder === 'family_first' ? [family, given] : [given, family];
  return ordered.filter((part) => part !== '').join(' ');
}

/**
 * LOSSY guess at the parts of a recipient, for integrations only (§ 3.10):
 * PayPal payer objects, CRM and marketing connectors that insist on two
 * fields, and only when the row carries no parts. Never use it for display
 * or storage — a space is not a name boundary (Spanish double surnames,
 * Indonesian single names, "Văn A"). The result carries `lossy: true` so a
 * consumer cannot mistake it for data a person entered.
 *
 * `given_first` splits on the LAST space (the family name is the last token);
 * `family_first` splits on the FIRST space (the family name is the first
 * token). One token → given name only. Round-trips `composeRecipient` for
 * single-token parts.
 */
export function splitNameFallback(
  recipient: string,
  nameOrder: NameOrder
): { givenName: string; familyName: string; lossy: true } {
  const text = textOf(recipient).replace(/\s+/g, ' ');
  if (text === '') {
    return { givenName: '', familyName: '', lossy: true };
  }
  const at =
    nameOrder === 'family_first' ? text.indexOf(' ') : text.lastIndexOf(' ');
  if (at < 0) {
    return { givenName: text, familyName: '', lossy: true };
  }
  const head = text.slice(0, at);
  const tail = text.slice(at + 1);
  return nameOrder === 'family_first'
    ? { givenName: tail, familyName: head, lossy: true }
    : { givenName: head, familyName: tail, lossy: true };
}

/**
 * Server-side name normalization for the data processors that run before
 * `validateAddress` (§ 3.8, § 3.12). `address` is the request payload (a key
 * is "sent" when it is not `undefined`); `previous` is the stored row on
 * update. Returns a NEW row; the input is not mutated.
 *
 * Rules:
 * - Parts sent and non-empty, `recipient` empty or absent → compose it from
 *   the effective parts (sent value, else the stored one) in `nameOrder`.
 * - `recipient` sent alone → kept as is.
 * - Both sent → both kept ('single'); in 'split' mode `recipient` is always
 *   recomposed from the parts, so a row with parts never disagrees with them.
 * - 'single' mode, `recipient` changed from `previous` and no parts sent →
 *   `given_name` and `family_name` are cleared (null) for the same reason.
 * - Parts are never invented from a recipient: `splitNameFallback` is not
 *   called here.
 */
export function normalizeNameParts(
  address: AddressRow,
  opts: NormalizeNamePartsOptions
): AddressRow {
  const { nameFormat, nameOrder, previous } = opts;
  const next: AddressRow = { ...address };

  const givenSent = address.given_name !== undefined;
  const familySent = address.family_name !== undefined;
  const partsSent = givenSent || familySent;
  const recipientSent = address.recipient !== undefined;

  const given = textOf(givenSent ? address.given_name : previous?.given_name);
  const family = textOf(
    familySent ? address.family_name : previous?.family_name
  );
  const recipient = textOf(address.recipient);

  if (nameFormat === 'split' && partsSent) {
    next.recipient = composeRecipient(
      { givenName: given, familyName: family },
      nameOrder
    );
    return next;
  }

  if (partsSent && (given !== '' || family !== '') && recipient === '') {
    next.recipient = composeRecipient(
      { givenName: given, familyName: family },
      nameOrder
    );
    return next;
  }

  if (
    nameFormat === 'single' &&
    recipientSent &&
    !partsSent &&
    previous !== undefined &&
    recipient !== textOf(previous.recipient)
  ) {
    next.given_name = null;
    next.family_name = null;
  }

  return next;
}
