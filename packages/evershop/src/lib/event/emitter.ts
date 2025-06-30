import { insert } from '@evershop/postgres-query-builder';
import { pool } from '../postgres/connection.js';

/**
 * Emit an event, this is used to trigger actions when an event occurs
 * @param name - The name of the event
 * @param data - The data to emit
 */
export async function emit(name: string, data: Record<string, any>) {
  await insert('event')
    .given({
      name,
      data
    })
    .execute(pool);
}
