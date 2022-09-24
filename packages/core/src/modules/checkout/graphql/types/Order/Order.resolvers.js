const { select } = require("@evershop/mysql-query-builder");
const { camelCase } = require("../../../../../lib/util/camelCase");

module.exports = {
  Query: {
    order: async (_, { id }, { pool, tokenPayload }) => {
      const { customerId, sid } = tokenPayload;
      const query = select()
        .from('order');
      query.where('order_id', '=', id)
      query.andWhere('customer_id', '=', customerId)
        .or('sid', '=', sid);
      const order = await query.load(pool);
      if (!order) {
        return null;
      } else {
        return camelCase(order)
      }
    }
  },
  Order: {
    items: async ({ orderId }, { }, { pool, user }) => {
      const items = await select().from('order_item').where('order_item_order_id', '=', orderId).execute(pool);
      return items.map((item) => camelCase(item));
    },
    shippingAddress: async ({ shippingAddressId }, { }, { pool, user }) => {
      const address = await select().from('order_address').where('order_address_id', '=', shippingAddressId).load(pool);
      return address ? camelCase(address) : null;
    },
    billingAddress: async ({ billingAddressId }, { }, { pool, user }) => {
      const address = await select().from('order_address').where('order_address_id', '=', billingAddressId).load(pool);
      return address ? camelCase(address) : null;
    }
  }
}
