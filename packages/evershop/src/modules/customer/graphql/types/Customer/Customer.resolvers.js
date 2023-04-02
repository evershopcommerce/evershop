const { select } = require('@evershop/postgres-query-builder');
const { buildUrl } = require('@evershop/evershop/src/lib/router/buildUrl');
const { camelCase } = require('@evershop/evershop/src/lib/util/camelCase');
const { get } = require('@evershop/evershop/src/lib/util/get');

module.exports = {
  Query: {
    customer: async (root, { id }, { pool }) => {
      const query = select().from('customer');
      query.where('uuid', '=', id);

      const customer = await query.load(pool);
      return customer ? camelCase(customer) : null;
    },
    customers: async (_, { filters = [] }, { pool, userTokenPayload }) => {
      // This field is for admin only
      if (!get(userTokenPayload, 'user.uuid', false)) {
        return [];
      }
      const query = select().from('customer');
      const currentFilters = [];

      // Attribute filters
      filters.forEach((filter) => {
        if (filter.key === 'full_name') {
          query.andWhere('customer.full_name', 'LIKE', `%${filter.value}%`);
          currentFilters.push({
            key: 'full_name',
            operation: '=',
            value: filter.value
          });
        }
        if (filter.key === 'status') {
          query.andWhere('customer.status', '=', filter.value);
          currentFilters.push({
            key: 'status',
            operation: '=',
            value: filter.value
          });
        }
        if (filter.key === 'email') {
          query.andWhere('customer.email', 'LIKE', `%${filter.value}%`);
          currentFilters.push({
            key: 'email',
            operation: '=',
            value: filter.value
          });
        }
      });

      const sortBy = filters.find((f) => f.key === 'sortBy');
      const sortOrder = filters.find(
        (f) => f.key === 'sortOrder' && ['ASC', 'DESC'].includes(f.value)
      ) || { value: 'ASC' };
      if (sortBy && sortBy.value === 'full_name') {
        query.orderBy('customer.full_name', sortOrder.value);
        currentFilters.push({
          key: 'sortBy',
          operation: '=',
          value: sortBy.value
        });
      } else {
        query.orderBy('customer.customer_id', 'DESC');
      }

      if (sortOrder.key) {
        currentFilters.push({
          key: 'sortOrder',
          operation: '=',
          value: sortOrder.value
        });
      }
      // Clone the main query for getting total right before doing the paging
      const cloneQuery = query.clone();
      cloneQuery.select('COUNT(customer.customer_id)', 'total');
      cloneQuery.removeOrderBy();
      // Paging
      const page = filters.find((f) => f.key === 'page') || { value: 1 };
      const limit = filters.find((f) => f.key === 'limit') || { value: 20 }; // TODO: Get from config
      currentFilters.push({
        key: 'page',
        operation: '=',
        value: page.value
      });
      currentFilters.push({
        key: 'limit',
        operation: '=',
        value: limit.value
      });
      query.limit(
        (page.value - 1) * parseInt(limit.value, 10),
        parseInt(limit.value, 10)
      );
      return {
        items: (await query.execute(pool)).map((row) => camelCase(row)),
        total: (await cloneQuery.load(pool)).total,
        currentFilters
      };
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
