const { select } = require("@evershop/mysql-query-builder");
const { camelCase } = require("../../../../../lib/util/camelCase");

module.exports = {
  Order: {
    paymentTransactions: async ({ orderId }, { }, { pool }) => {
      const items = await select()
        .from('payment_transaction')
        .where('payment_transaction_order_id', '=', orderId)
        .execute(pool);
      return items.map((item) => camelCase(item));
    }
  }
}
