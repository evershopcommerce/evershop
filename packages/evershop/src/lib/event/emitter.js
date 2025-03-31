import { insert } from '@evershop/postgres-query-builder';
import { pool } from '@evershop/evershop/src/lib/postgres/connection.js';

export async function emit(name, data) {
  await insert('event')
    .given({
      name,
      data
    })
    .execute(pool);
}
