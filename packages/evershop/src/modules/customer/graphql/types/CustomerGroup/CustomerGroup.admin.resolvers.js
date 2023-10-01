const { select } = require('@evershop/postgres-query-builder');
const { buildUrl } = require('@evershop/evershop/src/lib/router/buildUrl');
const { camelCase } = require('@evershop/evershop/src/lib/util/camelCase');
const {
  getCustomerGroupsBaseQuery
} = require('../../../services/getCustomerGroupsBaseQuery');
const {
  CustomerGroupCollection
} = require('../../../services/CustomerGroupCollection');

module.exports = {
  Query: {
    customerGroup: async (root, { id }, { pool }) => {
      const group = await select()
        .from('customer_group')
        .where('customer_group.customer_group_id', '=', id)
        .load(pool);

      return group ? camelCase(group) : null;
    },
    customerGroups: async (_, { filters = [] }) => {
      const query = getCustomerGroupsBaseQuery();
      const root = new CustomerGroupCollection(query);
      await root.init({}, { filters });
      return root;
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
