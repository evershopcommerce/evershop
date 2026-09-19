import { insert, type PoolClient } from '@evershop/postgres-query-builder';
import { Pool } from 'pg';
import { EventDataRegistry, EventName } from '../../types/event.js';
import { pool } from '../postgres/connection.js';

/**
 * Emit a typed event. The event data type is inferred from the event name.
 *
 * `conn` is optional. When omitted the insert runs through the default
 * `pool` connection and commits independently — fine when the emit happens
 * AFTER the caller has committed its own work. When the caller still owns
 * an open transaction (the nested-tx path inside `createShipment` /
 * `updateShipmentStatus` where `ownsTx === false`), pass the caller's
 * connection so the event insert lives or dies with the rest of the work.
 * Otherwise subscribers see uncommitted state if the caller rolls back.
 *
 * @param name - The name of the event (must be registered in EventDataRegistry)
 * @param data - The data to emit (type is inferred from event name)
 * @param conn - Optional caller-owned connection. Defaults to `pool`.
 */
export async function emit<T extends EventName>(
  name: T,
  data: EventDataRegistry[T],
  conn?: PoolClient | Pool
): Promise<void>;

/**
 * Emit an untyped event. Use this for dynamic events that aren't registered.
 * @param name - The name of the event
 * @param data - The data to emit
 * @param conn - Optional caller-owned connection. Defaults to `pool`.
 */
export async function emit(
  name: string,
  data: Record<string, any>,
  conn?: PoolClient | Pool
): Promise<void>;

// Implementation
export async function emit(
  name: string,
  data: Record<string, any>,
  conn?: PoolClient | Pool
) {
  await insert('event')
    .given({
      name,
      data
    })
    .execute(conn ?? pool);
}
