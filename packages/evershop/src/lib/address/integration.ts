/**
 * Consumer-neutral address shape for integrations (spec § 3.10). PayPal,
 * Stripe, carriers and tax map from `IntegrationAddress` by token meaning
 * instead of naming columns; each keeps its own field names on the way out.
 */
import { getCountryName } from './countries.js';
import { getAddressFormat } from './formats.js';
import { composeRecipient } from './names.js';
import { getRegionLevels, resolveRegionName } from './regions.js';
import { LEVEL_ORDER } from './tokens.js';
import type {
  AddressRow,
  IntegrationAddress,
  NameOrder,
  ResolvedNames
} from './types.js';

/** `US-CA` → `CA`; a name key such as `Kowloon` has no suffix. */
const ISO_SUBDIVISION = /^[A-Z]{2}-(.+)$/;

function textOf(value: unknown): string {
  if (value === undefined || value === null) {
    return '';
  }
  return typeof value === 'string' ? value.trim() : String(value).trim();
}

/**
 * Map a stored row plus its resolved display names to the integration shape.
 * `recipient` is composed from the stored parts (in `nameOrder`) only when
 * the row has none; the parts are passed through when present and never
 * invented here — a consumer that needs two fields and has none calls
 * `splitNameFallback` itself and owns that lossy decision.
 */
export function toIntegrationAddress(
  row: AddressRow,
  names: ResolvedNames,
  nameOrder: NameOrder = 'given_first'
): IntegrationAddress {
  const givenName = textOf(row.given_name);
  const familyName = textOf(row.family_name);
  const recipient =
    textOf(row.recipient) || composeRecipient({ givenName, familyName }, nameOrder);

  const result: IntegrationAddress = {
    recipient,
    lines: [row.address_line_1, row.address_line_2, row.address_line_3]
      .map(textOf)
      .filter((line) => line !== ''),
    country: textOf(row.country).toUpperCase()
  };

  if (givenName !== '') {
    result.givenName = givenName;
  }
  if (familyName !== '') {
    result.familyName = familyName;
  }
  const organization = textOf(row.organization);
  if (organization !== '') {
    result.organization = organization;
  }

  const dependentLocality =
    textOf(names.dependentLocality) || textOf(row.dependent_locality);
  if (dependentLocality !== '') {
    result.dependentLocality = dependentLocality;
  }
  const locality = textOf(names.locality) || textOf(row.locality);
  if (locality !== '') {
    result.locality = locality;
  }

  const key = textOf(row.administrative_area);
  if (key !== '') {
    const suffix = ISO_SUBDIVISION.exec(key)?.[1];
    result.administrativeArea = {
      key,
      name: textOf(names.administrativeArea) || key,
      ...(suffix ? { isoSuffix: suffix } : {})
    };
  }

  const postalCode = textOf(row.postal_code);
  if (postalCode !== '') {
    result.postalCode = postalCode;
  }
  const sortingCode = textOf(row.sorting_code);
  if (sortingCode !== '') {
    result.sortingCode = sortingCode;
  }
  const telephone = textOf(row.telephone);
  if (telephone !== '') {
    result.telephone = telephone;
  }
  return result;
}

/**
 * `toIntegrationAddress` for a stored row: resolves the region names through
 * the providers (a free-text level is used as typed), the country name, and
 * the record's `name_order` for a recipient composed from parts. `locale`
 * defaults to the runtime's.
 */
export async function toIntegrationAddressFromRow(
  row: AddressRow,
  locale?: string
): Promise<IntegrationAddress> {
  const country = textOf(row.country).toUpperCase();
  const enumerated = getRegionLevels(country);
  const names: ResolvedNames = {
    country: country === '' ? undefined : getCountryName(country, locale)
  };
  const nameOf = async (level: (typeof LEVEL_ORDER)[number]) => {
    const key = textOf(row[level]);
    if (key === '') {
      return undefined;
    }
    const parentPath = LEVEL_ORDER.slice(0, LEVEL_ORDER.indexOf(level))
      .filter((outer) => enumerated.includes(outer))
      .map((outer) => textOf(row[outer]));
    return resolveRegionName(country, level, key, locale, parentPath);
  };
  names.administrativeArea = await nameOf('administrative_area');
  names.locality = await nameOf('locality');
  names.dependentLocality = await nameOf('dependent_locality');
  return toIntegrationAddress(
    row,
    names,
    getAddressFormat(country).name_order ?? 'given_first'
  );
}
