import { insert } from '@evershop/postgres-query-builder';
import { pool } from '../../lib/postgres/connection.js';

export async function emit(name, data) {
  await insert('event')
    .given({
      name,
      data
    })
    .execute(pool);
}
