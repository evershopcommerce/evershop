import { randomUUID } from 'node:crypto';
import { getDb } from './db.js';

/**
 * Fixture world for the core-shipping rate-dialog specs.
 *
 * Convention (mirrors recommendationDb.ts): every row carries the `E2E-SHIP`
 * marker in its name so `cleanupShippingWorld()` can sweep an interrupted run
 * idempotently. Rates need no marker — they cascade from the method/zone FKs
 * (ON DELETE CASCADE on both sides).
 *
 * One method, four zones, one rate per zone — a rate is UNIQUE(method, zone),
 * so each calculation type gets its own zone:
 *   - price zone:  price_based_cost with TWO tiers, the first at min_price 0
 *                  (regression: only the last tier used to seed; 0 blanked)
 *   - weight zone: weight_based_cost with two tiers
 *   - flat zone:   plain cost
 *   - switch zone: plain cost, mutated by the calc-type-switch spec
 */

export interface ZoneFixture {
  zoneId: number;
  uuid: string;
  name: string;
}

export interface ShippingWorld {
  tag: string;
  methodId: number;
  methodUuid: string;
  methodName: string;
  priceZone: ZoneFixture;
  weightZone: ZoneFixture;
  flatZone: ZoneFixture;
  switchZone: ZoneFixture;
}

const MARKER = 'E2E-SHIP';

export const PRICE_TIERS = [
  { min_price: 0, cost: 10 },
  { min_price: 50, cost: 5.5 }
];
export const WEIGHT_TIERS = [
  { min_weight: 0, cost: 4 },
  { min_weight: 2.5, cost: 8 }
];
export const FLAT_COST = 12.5;
export const SWITCH_FLAT_COST = 3;

async function insertZone(name: string): Promise<ZoneFixture> {
  const db = getDb();
  const zone = await db.query<{ shipping_zone_id: number; uuid: string }>(
    `INSERT INTO shipping_zone (name) VALUES ($1)
     RETURNING shipping_zone_id, uuid`,
    [name]
  );
  const zoneId = zone.rows[0].shipping_zone_id;
  // Soft attach of the built-in Core provider — what makes the zone show up
  // in the admin "Core Shipping" section (MethodsList filters zones on it).
  await db.query(
    `INSERT INTO shipping_zone_provider (zone_id, provider_code, is_enabled)
     VALUES ($1, 'core', true)`,
    [zoneId]
  );
  return { zoneId, uuid: zone.rows[0].uuid, name };
}

export async function seedShippingWorld(): Promise<ShippingWorld> {
  const db = getDb();
  const tag = randomUUID().slice(0, 8);

  const priceZone = await insertZone(`${MARKER} Price ${tag}`);
  const weightZone = await insertZone(`${MARKER} Weight ${tag}`);
  const flatZone = await insertZone(`${MARKER} Flat ${tag}`);
  const switchZone = await insertZone(`${MARKER} Switch ${tag}`);

  const methodName = `${MARKER} Method ${tag}`;
  const method = await db.query<{
    core_shipping_method_id: number;
    uuid: string;
  }>(
    `INSERT INTO core_shipping_method (name, is_enabled, sort_order)
     VALUES ($1, true, 0)
     RETURNING core_shipping_method_id, uuid`,
    [methodName]
  );
  const methodId = method.rows[0].core_shipping_method_id;

  await db.query(
    `INSERT INTO core_shipping_method_rate (method_id, zone_id, is_enabled, price_based_cost)
     VALUES ($1, $2, true, $3::jsonb)`,
    [methodId, priceZone.zoneId, JSON.stringify(PRICE_TIERS)]
  );
  await db.query(
    `INSERT INTO core_shipping_method_rate (method_id, zone_id, is_enabled, weight_based_cost)
     VALUES ($1, $2, true, $3::jsonb)`,
    [methodId, weightZone.zoneId, JSON.stringify(WEIGHT_TIERS)]
  );
  await db.query(
    `INSERT INTO core_shipping_method_rate (method_id, zone_id, is_enabled, cost)
     VALUES ($1, $2, true, $3)`,
    [methodId, flatZone.zoneId, FLAT_COST]
  );
  await db.query(
    `INSERT INTO core_shipping_method_rate (method_id, zone_id, is_enabled, cost)
     VALUES ($1, $2, true, $3)`,
    [methodId, switchZone.zoneId, SWITCH_FLAT_COST]
  );

  return {
    tag,
    methodId,
    methodUuid: method.rows[0].uuid,
    methodName,
    priceZone,
    weightZone,
    flatZone,
    switchZone
  };
}

/**
 * Raw rate columns for DB-level assertions (jsonb comes back parsed by pg).
 */
export async function getRateColumns(
  methodId: number,
  zoneId: number
): Promise<{
  cost: string | null;
  condition_type: string | null;
  min: string | null;
  max: string | null;
  price_based_cost: Array<Record<string, unknown>> | null;
  weight_based_cost: Array<Record<string, unknown>> | null;
} | null> {
  const db = getDb();
  const result = await db.query(
    `SELECT cost, condition_type, min, max, price_based_cost, weight_based_cost
     FROM core_shipping_method_rate
     WHERE method_id = $1 AND zone_id = $2`,
    [methodId, zoneId]
  );
  return result.rows[0] ?? null;
}

/**
 * Global sweep by marker — idempotent, safe before AND after a run. Rates
 * cascade from both deletes; shipping_zone_provider cascades from the zone.
 * WORKERS=1 ASSUMPTION (same as recommendationDb.ts): the sweep is global
 * over the marker, so parallel workers would tear down a sibling's world.
 */
export async function cleanupShippingWorld(): Promise<void> {
  const db = getDb();
  await db.query(`DELETE FROM core_shipping_method WHERE name LIKE $1`, [
    `${MARKER}%`
  ]);
  await db.query(`DELETE FROM shipping_zone WHERE name LIKE $1`, [
    `${MARKER}%`
  ]);
}
