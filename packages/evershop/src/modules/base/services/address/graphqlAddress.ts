import { getCountryName } from '../../../../lib/address/countries.js';
import { formatAddressRow } from '../../../../lib/address/display.js';
import {
  getRegionLevels,
  getRegionProvider,
  regionDisplayName,
  resolveRegionName
} from '../../../../lib/address/regions.js';
import { ADDRESS_COLUMNS, LEVEL_ORDER } from '../../../../lib/address/tokens.js';
import type { AddressLevel, Region } from '../../../../lib/address/types.js';
import { getActiveLocale } from '../../../../lib/locale/localeContext.js';
import { camelCase } from '../../../../lib/util/camelCase.js';
import type { Address } from '../../../../types/address.js';

/**
 * What the `Address` GraphQL interface needs on the server (spec § 3.7):
 *
 * - `toGraphqlAddress(row, typename)` is what the CartAddress / CustomerAddress
 *   / OrderAddress parent resolvers return: `camelCase(row)` plus the RAW
 *   `extra` (its keys are never camel-cased), `__typename` for
 *   `Address.__resolveType`, and the row itself for the field resolvers.
 * - `addressFieldResolvers` is the shared field map: every level below country
 *   is a `Region { key, name, isoCode }`, `country` resolves through the
 *   `Country` type, `formatted` renders the row for the request locale.
 */
export type AddressTypename = 'CartAddress' | 'CustomerAddress' | 'OrderAddress';

const ROW = '__row';

export interface RegionGraphql {
  key: string;
  name: string;
  isoCode: string | null;
}

function textOf(value: unknown): string {
  if (value === undefined || value === null) {
    return '';
  }
  return typeof value === 'string' ? value.trim() : String(value).trim();
}

export function toGraphqlAddress(
  row: Address,
  typename: AddressTypename
): Record<string, unknown> {
  return {
    ...camelCase(row as Record<string, unknown>),
    extra: (row.extra as Record<string, unknown> | null | undefined) ?? null,
    __typename: typename,
    [ROW]: row
  };
}

const CAMEL_TO_COLUMN: Record<string, string> = Object.fromEntries(
  ADDRESS_COLUMNS.map((column) => [
    column.replace(/_([a-z0-9])/g, (_, ch: string) => ch.toUpperCase()),
    column
  ])
);

/** The stored row behind a parent object; rebuilt from camelCase keys when a caller did not use `toGraphqlAddress`. */
export function rowOf(parent: Record<string, unknown>): Address {
  if (parent && typeof parent[ROW] === 'object' && parent[ROW] !== null) {
    return parent[ROW] as Address;
  }
  const row: Address = {};
  for (const [camel, column] of Object.entries(CAMEL_TO_COLUMN)) {
    if (parent[camel] !== undefined) {
      row[column] = parent[camel] as string | null;
    }
  }
  if (parent.extra !== undefined) {
    row.extra = parent.extra as Record<string, unknown> | null;
  }
  return row;
}

/** `Region` for a stored key at `level`, with the outer enumerated levels as parent path. */
export async function regionForRow(
  row: Address,
  level: AddressLevel,
  locale: string
): Promise<RegionGraphql | null> {
  const key = textOf(row[level]);
  if (key === '') {
    return null;
  }
  const country = textOf(row.country).toUpperCase();
  const levels = getRegionLevels(country);
  const parentPath = LEVEL_ORDER.slice(0, LEVEL_ORDER.indexOf(level))
    .filter((outer) => levels.includes(outer))
    .map((outer) => textOf(row[outer]));
  let isoCode: string | null = null;
  const index = levels.indexOf(level);
  if (index >= 0 && parentPath.length >= index) {
    const list = await getRegionProvider(country).list(parentPath.slice(0, index), locale);
    isoCode = list.find((r) => r.key === key)?.isoCode ?? null;
  }
  return {
    key,
    name: await resolveRegionName(country, level, key, locale, parentPath),
    isoCode
  };
}

/** `Region` for an entry already listed by a provider (the `regions` queries). */
export function toRegionGraphql(
  region: Region,
  country: string,
  locale: string
): RegionGraphql & { retired: boolean; mergedInto: string | null } {
  return {
    key: region.key,
    name: regionDisplayName(region, country, locale),
    isoCode: region.isoCode ?? null,
    retired: Boolean(region.retired),
    mergedInto: region.mergedInto ?? null
  };
}

export const addressFieldResolvers = {
  dependentLocality: (parent: Record<string, unknown>) =>
    regionForRow(rowOf(parent), 'dependent_locality', getActiveLocale()),
  locality: (parent: Record<string, unknown>) =>
    regionForRow(rowOf(parent), 'locality', getActiveLocale()),
  administrativeArea: (parent: Record<string, unknown>) =>
    regionForRow(rowOf(parent), 'administrative_area', getActiveLocale()),
  country: (parent: Record<string, unknown>) => {
    const code = textOf(rowOf(parent).country).toUpperCase();
    return code === '' ? null : { code, name: getCountryName(code) };
  },
  extra: (parent: Record<string, unknown>) =>
    (rowOf(parent).extra as Record<string, unknown> | null | undefined) ?? null,
  formatted: (parent: Record<string, unknown>) =>
    formatAddressRow(rowOf(parent), getActiveLocale())
};
