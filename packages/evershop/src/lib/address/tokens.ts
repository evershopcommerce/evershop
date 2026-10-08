/**
 * Token ↔ column table and the fixed facts every other module shares.
 * Pure module: no runtime imports.
 */
import type {
  AddressColumn,
  AddressLevel,
  AddressToken
} from './types.js';

/** Google token → the EverShop column(s) it expands to. `%A` expands to up to three lines. */
export const TOKEN_COLUMNS: Record<AddressToken, AddressColumn[]> = {
  N: ['recipient'],
  O: ['organization'],
  A: ['address_line_1', 'address_line_2', 'address_line_3'],
  D: ['dependent_locality'],
  C: ['locality'],
  S: ['administrative_area'],
  Z: ['postal_code'],
  X: ['sorting_code']
};

/** Column → token. `country` and `telephone` have no postal token. */
export const COLUMN_TOKENS: Partial<Record<AddressColumn, AddressToken>> = {
  recipient: 'N',
  organization: 'O',
  address_line_1: 'A',
  address_line_2: 'A',
  address_line_3: 'A',
  dependent_locality: 'D',
  locality: 'C',
  administrative_area: 'S',
  postal_code: 'Z',
  sorting_code: 'X'
};

/** The 14 shared columns, in the storage order of § 3.1. */
export const ADDRESS_COLUMNS: readonly AddressColumn[] = [
  'recipient',
  'given_name',
  'family_name',
  'organization',
  'address_line_1',
  'address_line_2',
  'address_line_3',
  'dependent_locality',
  'locality',
  'administrative_area',
  'postal_code',
  'sorting_code',
  'country',
  'telephone'
];

/** Geographic levels, outermost first. `dependsOn` chains follow this order. */
export const LEVEL_ORDER: readonly AddressLevel[] = [
  'administrative_area',
  'locality',
  'dependent_locality'
];

/** Token for each geographic level. */
export const LEVEL_TOKENS: Record<AddressLevel, AddressToken> = {
  administrative_area: 'S',
  locality: 'C',
  dependent_locality: 'D'
};

/**
 * Row keys that are not address data. `unknown_field` is computed over the
 * payload keys minus these, so an API client may echo a row back unchanged.
 */
export const ADDRESS_ROW_METADATA_KEYS: readonly string[] = [
  'uuid',
  'customer_id',
  'customer_address_id',
  'cart_address_id',
  'order_address_id',
  'address_id',
  'is_default',
  'created_at',
  'updated_at',
  'extra'
];

/** Google's `require` letters that map to a field we collect. */
export const REQUIRABLE_TOKENS: readonly AddressToken[] = [
  'N',
  'O',
  'A',
  'D',
  'C',
  'S',
  'Z',
  'X'
];

/** The loose core telephone rule (§ 3.5): digits, plus, spaces and common separators, 6–20 chars. */
export const CORE_TELEPHONE_PATTERN = '^\\+?[0-9 ().\\-]{6,20}$';

/** The default record's country code in Google's dataset. */
export const DEFAULT_COUNTRY_CODE = 'ZZ';

export function isAddressColumn(id: string): id is AddressColumn {
  return (ADDRESS_COLUMNS as readonly string[]).includes(id);
}
