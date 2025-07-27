import { pool } from '@evershop/evershop/lib/postgres';

export async function get(ctx) {
  const { rows } = await pool.query(
    'SELECT COUNT(*)::int AS count FROM "Products" WHERE "vendorId" = $1',
    [ctx.user.id]
  );
  ctx.body = { productCount: rows[0].count };
}
