import { pool } from '@evershop/evershop/src/lib/postgres/connection';
import { hookBefore } from '@evershop/evershop/src/lib/util/hookable';
import { execute } from '@evershop/postgres-query-builder';

hookBefore('insertProduct', async (args, context) => {
    const { user } = context;
    if (user.role === 'vendor') {
        args.data.vendorId = user.id;
    }
});

hookBefore('updateProduct', async (args, context) => {
    const { user } = context;
    if (user.role === 'vendor') {
        const { rows } = await pool.query(
            'SELECT vendorId FROM "Products" WHERE id = $1',
            [args.where.id]
        );
        if (!rows[0] || rows[0].vendorId !== user.id) {
            throw new Error('Forbidden');
        }
    }
});

