/**
 * Row → display values → lines (spec § 3.6). The server half of formatting:
 * region keys become names through the region registry, the country code
 * becomes its display name, and `formatAddress` renders the record's layout
 * for the locale. `formatted` in GraphQL, the order email and the admin order
 * view all read this.
 */
import { getCountryName } from './countries.js';
import { selectFormat } from './derive.js';
import { formatAddress } from './format.js';
import type { FormatAddressOptions } from './format.js';
import { getAddressFormat } from './formats.js';
import { composeRecipient } from './names.js';
import { getRegionLevels, resolveRegionName } from './regions.js';
import { getAddressRuntime } from './runtime.js';
import { LEVEL_ORDER, LEVEL_TOKENS } from './tokens.js';
import type { AddressRow, AddressToken } from './types.js';

/** Display strings per token; `A` is the list of non-empty address lines. */
export type AddressDisplayValues = Partial<
  Record<AddressToken | 'country', string | string[]>
>;

function textOf(value: unknown): string {
  if (value === undefined || value === null) {
    return '';
  }
  return typeof value === 'string' ? value.trim() : String(value).trim();
}

/**
 * Map a stored row to display strings keyed by token. Enumerated levels
 * (`getRegionLevels`) resolve through `resolveRegionName` with the keys of
 * the outer enumerated levels as parent path; free-text levels are used as
 * is. Empty values are omitted.
 */
export async function resolveAddressDisplayValues(
  row: AddressRow,
  locale?: string
): Promise<AddressDisplayValues> {
  const country = textOf(row.country).toUpperCase();
  const values: AddressDisplayValues = {};

  let recipient = textOf(row.recipient);
  if (recipient === '' && (textOf(row.given_name) || textOf(row.family_name))) {
    recipient = composeRecipient(
      { givenName: row.given_name, familyName: row.family_name },
      getAddressFormat(country).name_order ?? 'given_first'
    );
  }
  if (recipient !== '') {
    values.N = recipient;
  }

  const organization = textOf(row.organization);
  if (organization !== '') {
    values.O = organization;
  }

  const lines = [row.address_line_1, row.address_line_2, row.address_line_3]
    .map(textOf)
    .filter((line) => line !== '');
  if (lines.length > 0) {
    values.A = lines;
  }

  const enumerated = country !== '' ? getRegionLevels(country) : [];
  const parentPath: string[] = [];
  for (const level of LEVEL_ORDER) {
    const key = textOf(row[level]);
    const isEnumerated = enumerated.includes(level);
    if (key !== '') {
      values[LEVEL_TOKENS[level]] = isEnumerated
        ? await resolveRegionName(country, level, key, locale, [...parentPath])
        : key;
    }
    if (isEnumerated) {
      parentPath.push(key);
    }
  }

  const postalCode = textOf(row.postal_code);
  if (postalCode !== '') {
    values.Z = postalCode;
  }
  const sortingCode = textOf(row.sorting_code);
  if (sortingCode !== '') {
    values.X = sortingCode;
  }
  if (country !== '') {
    values.country = textOf(getCountryName(country, locale)) || country;
  }
  return values;
}

/**
 * Render a stored row as display lines in the record's layout for `locale`
 * (`fmt` or `lfmt` through `selectFormat`), the country name last.
 */
export async function formatAddressRow(
  row: AddressRow,
  locale?: string,
  opts?: FormatAddressOptions
): Promise<string[]> {
  const effectiveLocale = locale ?? getAddressRuntime().getLocale();
  const record = getAddressFormat(textOf(row.country).toUpperCase());
  const { format } = selectFormat(record, effectiveLocale);
  const values = await resolveAddressDisplayValues(row, effectiveLocale);
  return formatAddress(values, format, opts);
}
