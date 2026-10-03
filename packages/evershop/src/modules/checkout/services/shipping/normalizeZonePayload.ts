import { getCountryName, isKnownCountry } from '../../../../lib/address/countries.js';
import { isActiveRegionKey } from '../../../../lib/address/regions.js';
import { LEVEL_ORDER } from '../../../../lib/address/tokens.js';
import type { AddressLevel } from '../../../../lib/address/types.js';
import { getAddressSettings } from '../../../base/services/address/getAddressSettings.js';

/**
 * Shipping-zone REST payload (spec § 3.3, § 3.7, § 3.13 — D-22):
 *
 *   { name, countries: ['US', 'CA'], regions: [{ country: 'US', level?: 'administrative_area', key: 'US-CA' }] }
 *
 * - every country must be a known ISO 3166-1 code; at least one is required;
 * - every region must belong to one of the zone's countries and be an ACTIVE
 *   key at its level (retired keys are rejected: a zone is live logistics
 *   configuration, unlike a stored address);
 * - a country outside the merchant's sell-to list is NOT rejected: it comes
 *   back in `warnings` ("intent wins, logistics is flagged").
 */
export interface ZoneRegionEntry {
  country: string;
  level: AddressLevel;
  key: string;
}

export interface NormalizedZonePayload {
  name: string;
  countries: string[];
  regions: ZoneRegionEntry[];
  warnings: string[];
}

export class ZonePayloadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ZonePayloadError';
  }
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

export async function normalizeZonePayload(
  body: unknown
): Promise<NormalizedZonePayload> {
  const input = (body ?? {}) as Record<string, unknown>;
  const name = text(input.name);
  if (name === '') {
    throw new ZonePayloadError('Zone name is required');
  }

  const countries: string[] = [];
  for (const raw of Array.isArray(input.countries) ? input.countries : []) {
    const code = text(raw).toUpperCase();
    if (code === '') {
      continue;
    }
    if (!isKnownCountry(code)) {
      throw new ZonePayloadError(`Unknown country code "${code}"`);
    }
    if (!countries.includes(code)) {
      countries.push(code);
    }
  }
  if (countries.length === 0) {
    throw new ZonePayloadError('At least one country is required');
  }

  const regions: ZoneRegionEntry[] = [];
  const seen = new Set<string>();
  for (const raw of Array.isArray(input.regions) ? input.regions : []) {
    if (!raw || typeof raw !== 'object') {
      continue;
    }
    const entry = raw as Record<string, unknown>;
    const country = text(entry.country).toUpperCase();
    const key = text(entry.key);
    const level = (text(entry.level) || 'administrative_area') as AddressLevel;
    if (key === '') {
      continue;
    }
    if (!countries.includes(country)) {
      throw new ZonePayloadError(
        `Region "${key}" belongs to ${country || 'an unknown country'}, which is not one of the zone's countries`
      );
    }
    if (!(LEVEL_ORDER as readonly string[]).includes(level)) {
      throw new ZonePayloadError(`Unknown region level "${level}"`);
    }
    if (!(await isActiveRegionKey(country, level, key))) {
      throw new ZonePayloadError(
        `"${key}" is not an active region of ${getCountryName(country)}`
      );
    }
    const id = `${country}|${level}|${key}`;
    if (!seen.has(id)) {
      seen.add(id);
      regions.push({ country, level, key });
    }
  }

  const warnings: string[] = [];
  const { sellToCountries } = getAddressSettings();
  if (sellToCountries !== 'all') {
    const allowed = new Set(sellToCountries.map((c) => c.toUpperCase()));
    for (const code of countries) {
      if (!allowed.has(code)) {
        warnings.push(
          `${getCountryName(code)} is not in the countries you sell to; this zone will not be offered at checkout until it is`
        );
      }
    }
  }

  return { name, countries, regions, warnings };
}
