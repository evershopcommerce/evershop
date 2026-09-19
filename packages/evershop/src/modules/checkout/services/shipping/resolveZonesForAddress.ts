import { select } from '@evershop/postgres-query-builder';
import { pool } from '../../../../lib/postgres/connection.js';
import type { ShippingZoneRow } from '../../../../types/db/index.js';

export interface ZoneAddressFilter {
  country: string;
  province?: string | null;
  /** Reserved for postcode-aware zone matching; not used yet in v1. */
  postcode?: string | null;
}

/**
 * Resolve the shipping zones that cover a given destination address.
 *
 * A zone matches iff:
 *   (a) the destination country is in the zone's `shipping_zone_country` rows; AND
 *   (b) either (i) the zone has no `shipping_zone_province` rows for that country
 *       (the whole country is covered), or (ii) the destination province matches
 *       one of those rows.
 *
 * Multiple zones may match a single address — overlapping coverage is allowed.
 * The orchestrator iterates over every matching zone and fans out provider
 * calls per zone.
 *
 * See wiki/shipping-provider-design.md → "Data flow" / "Listing methods at checkout".
 */
export async function resolveZonesForAddress(
  filter: ZoneAddressFilter
): Promise<ShippingZoneRow[]> {
  if (!filter.country) return [];

  // Candidate zones — those whose shipping_zone_country contains the destination country.
  // postgres-query-builder: `.on(...)` returns the Join node, not the query;
  // store the query handle and call .where() etc. on it separately.
  const candidateQuery = select(
    'shipping_zone.shipping_zone_id',
    'shipping_zone.uuid',
    'shipping_zone.name'
  ).from('shipping_zone');
  candidateQuery
    .innerJoin('shipping_zone_country')
    .on(
      'shipping_zone_country.zone_id',
      '=',
      'shipping_zone.shipping_zone_id'
    );
  candidateQuery.where('shipping_zone_country.country', '=', filter.country);

  const candidates = (await candidateQuery.execute(pool)) as ShippingZoneRow[];

  if (candidates.length === 0) return [];

  // Province restrictions for those candidates + the destination country.
  const zoneIds = candidates.map((z) => z.shipping_zone_id);
  const provinceRows = (await select('zone_id', 'province')
    .from('shipping_zone_province')
    .where('zone_id', 'IN', zoneIds)
    .and('country', '=', filter.country)
    .execute(pool)) as Array<{ zone_id: number; province: string }>;

  // Group province codes by zone.
  const provincesByZone = new Map<number, Set<string>>();
  for (const row of provinceRows) {
    let set = provincesByZone.get(row.zone_id);
    if (!set) {
      set = new Set();
      provincesByZone.set(row.zone_id, set);
    }
    set.add(row.province);
  }

  // Filter: a zone passes iff there are no province restrictions for this
  // country, OR the destination province matches one of the restrictions.
  return candidates.filter((zone) => {
    const restrictions = provincesByZone.get(zone.shipping_zone_id);
    if (!restrictions || restrictions.size === 0) return true;
    return Boolean(filter.province) && restrictions.has(filter.province!);
  });
}
