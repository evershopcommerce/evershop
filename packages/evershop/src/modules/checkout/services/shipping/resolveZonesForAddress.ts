import { select } from '@evershop/postgres-query-builder';
import { pool } from '../../../../lib/postgres/connection.js';
import type { ShippingZoneRow } from '../../../../types/db/index.js';

export interface ZoneAddressFilter {
  country: string;
  /** The stored `administrative_area` key (`US-CA`). */
  administrativeArea?: string | null;
  /** Reserved for postal-code-aware zone matching; not used yet in v1. */
  postalCode?: string | null;
}

/**
 * Resolve the shipping zones that cover a given destination address.
 *
 * A zone matches iff:
 *   (a) the destination country is in the zone's `shipping_zone_country` rows; AND
 *   (b) either (i) the zone has no `shipping_zone_region` rows at level
 *       `administrative_area` for that country (the whole country is covered),
 *       or (ii) the destination's administrative-area key matches one of those
 *       rows. Keys are compared as stored; a retired key on a zone matches no
 *       new address because the form no longer offers it (spec § 3.3).
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

  // Region restrictions for those candidates + the destination country.
  const zoneIds = candidates.map((z) => z.shipping_zone_id);
  const regionRows = (await select('zone_id', 'region_key')
    .from('shipping_zone_region')
    .where('zone_id', 'IN', zoneIds)
    .and('country', '=', filter.country)
    .and('level', '=', 'administrative_area')
    .execute(pool)) as Array<{ zone_id: number; region_key: string }>;

  // Group region keys by zone.
  const regionsByZone = new Map<number, Set<string>>();
  for (const row of regionRows) {
    let set = regionsByZone.get(row.zone_id);
    if (!set) {
      set = new Set();
      regionsByZone.set(row.zone_id, set);
    }
    set.add(row.region_key);
  }

  // Filter: a zone passes iff there are no region restrictions for this
  // country, OR the destination's administrative area matches one of them.
  const area = filter.administrativeArea?.trim();
  return candidates.filter((zone) => {
    const restrictions = regionsByZone.get(zone.shipping_zone_id);
    if (!restrictions || restrictions.size === 0) return true;
    return Boolean(area) && restrictions.has(area!);
  });
}
