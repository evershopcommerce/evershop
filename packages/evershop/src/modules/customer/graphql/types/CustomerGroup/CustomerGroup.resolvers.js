const { select } = require("@evershop/mysql-query-builder");
const { buildUrl } = require("../../../../../lib/router/buildUrl");
const { camelCase } = require("../../../../../lib/util/camelCase");

module.exports = {
  Query: {
    customerGroup: async (root, { id }, { pool, tokenPayload }) => {
      if (!tokenPayload.isAdmin) {
        return null;
      }
      const group = await select()
        .from('customer_group')
        .where('customer_group.`customer_group_id`', '=', id)
        .load(pool);

      return group ? camelCase(group) : null;
    },
    customerGroups: async (root, { id }, { pool, tokenPayload }) => {
      if (!tokenPayload.isAdmin) {
        return [];
      }
      const groups = await select()
        .from('customer_group')
        .execute(pool);
      return groups.map(group => camelCase(group));
    }
  },
  CustomerGroup: {
    customers: async (group, _, { pool }) => {
      const customers = await select()
        .from('customer')
        .where('customer.`group_id`', '=', group.customerGroupId)
        .execute(pool);
      return customers.map(customer => camelCase(customer));
    },
    editUrl: (group, _, { }) => buildUrl('customerGroupEdit', { id: group.customerGroupId }),
  }
}