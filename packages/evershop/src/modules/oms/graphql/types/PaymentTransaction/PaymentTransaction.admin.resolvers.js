import { select } from '@evershop/postgres-query-builder';
import { camelCase } from '../../../../../lib/util/camelCase.js';

export default {
  Order: {
    paymentTransactions: async ({ orderId }, _, { pool }) => {
      const items = await select()
        .from('payment_transaction')
        .where('payment_transaction_order_id', '=', orderId)
        .execute(pool);
      return items.map((item) => camelCase(item));
    }
  }
};
