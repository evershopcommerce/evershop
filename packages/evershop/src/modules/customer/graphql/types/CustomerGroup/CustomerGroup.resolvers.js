const { select } = require('@evershop/postgres-query-builder');
const { buildUrl } = require('@evershop/evershop/src/lib/router/buildUrl');
const { camelCase } = require('@evershop/evershop/src/lib/util/camelCase');

module.exports = {
  Query: {
    customerGroup: async (root, { id }, { pool, user }) => {
      if (!user) {
        return null;
      }
      const group = await select()
        .from('customer_group')
        .where('customer_group.customer_group_id', '=', id)
        .load(pool);

      return group ? camelCase(group) : null;
    },
    customerGroups: async (root, _, { pool, user }) => {
      if (!user) {
        return [];
      }
      const groups = await select().from('customer_group').execute(pool);
      return groups.map((group) => camelCase(group));
    }
  },
  CustomerGroup: {
    customers: async (group, _, { pool }) => {
      const customers = await select()
        .from('customer')
        .where('customer.group_id', '=', group.customerGroupId)
        .execute(pool);
      return customers.map((customer) => camelCase(customer));
    },
    editUrl: (group) =>
      buildUrl('customerGroupEdit', { id: group.customerGroupId })
  }
};
