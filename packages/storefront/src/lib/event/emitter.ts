import { insert } from '@storefront/postgres-query-builder';
import { EventDataRegistry, EventName } from '../../types/event.js';
import { pool } from '../postgres/connection.js';

/**
 * Emit a typed event. The event data type is inferred from the event name.
 * @param name - The name of the event (must be registered in EventDataRegistry)
 * @param data - The data to emit (type is inferred from event name)
 */
export async function emit<T extends EventName>(
  name: T,
  data: EventDataRegistry[T]
): Promise<void>;

/**
 * Emit an untyped event. Use this for dynamic events that aren't registered.
 * @param name - The name of the event
 * @param data - The data to emit
 */
export async function emit(
  name: string,
  data: Record<string, any>
): Promise<void>;

// Implementation
export async function emit(name: string, data: Record<string, any>) {
  await insert('event')
    .given({
      name,
      data
    })
    .execute(pool);
}
