const { select } = require('@evershop/postgres-query-builder');
const { buildUrl } = require('@evershop/evershop/src/lib/router/buildUrl');
const { camelCase } = require('@evershop/evershop/src/lib/util/camelCase');
const {
  getCustomersBaseQuery
} = require('../../../services/getCustomersBaseQuery');
const { CustomerCollection } = require('../../../services/CustomerCollection');

module.exports = {
  Query: {
    customer: async (root, { id }, { pool }) => {
      const query = select().from('customer');
      query.where('uuid', '=', id);

      const customer = await query.load(pool);
      return customer ? camelCase(customer) : null;
    },
    currentCustomer: async (root, args, { customer }) => customer ? camelCase(customer) : null,
    customers: async (_, { filters = [] }, { user }) => {
      // This field is for admin only
      if (!user) {
        return [];
      }
      const query = getCustomersBaseQuery();
      const root = new CustomerCollection(query);
      await root.init({}, { filters });
      return root;
    }
  },
  Customer: {
    url: ({ urlKey }) => buildUrl('customerView', { url_key: urlKey }),
    editUrl: ({ uuid }) => buildUrl('customerEdit', { id: uuid }),
    logoutApi: ({ uuid }) => buildUrl('deleteCustomerSession', { id: uuid }),
    updateApi: (customer) => buildUrl('updateCustomer', { id: customer.uuid }),
    deleteApi: (customer) => buildUrl('deleteCustomer', { id: customer.uuid }),
    group: async ({ groupId }, _, { pool }) => {
      const group = await select()
        .from('customer_group')
        .where('customer_group.customer_group_id', '=', groupId)
        .load(pool);
      return group ? camelCase(group) : null;
    },
    orders: async ({ customerId }, _, { pool }) => {
      const orders = await select()
        .from('order')
        .where('order.customer_id', '=', customerId)
        .execute(pool);
      return orders.map((row) => camelCase(row));
    }
  }
};
