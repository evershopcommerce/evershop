const { select } = require("@evershop/mysql-query-builder");
const { buildUrl } = require("../../../../../lib/router/buildUrl");
const { camelCase } = require("../../../../../lib/util/camelCase");
const { get } = require("../../../../../lib/util/get");

module.exports = {
  Query: {
    adminUser: async (root, { id }, { pool, tokenPayload }) => {
      if (!get(tokenPayload, "user.isAdmin", false)) {
        return null;
      }
      const query = select()
        .from('admin_user');
      query.where('admin_user_id', '=', id);

      const user = await query.load(pool);
      return user ? camelCase(user) : null;
    },
    adminUsers: async (_, { filters = [] }, { pool, tokenPayload }) => {
      // This field is for admin only
      if (!get(tokenPayload, "user.isAdmin", false)) {
        return [];
      }
      const query = select().from('admin_user');
      const currentFilters = [];

      // Attribute filters
      filters.forEach((filter) => {
        if (filter.key === 'full_name') {
          query.andWhere('admin_user.`full_name`', 'LIKE', `%${filter.value}%`);
          currentFilters.push({
            key: 'full_name',
            operation: '=',
            value: filter.value
          });
        }
        if (filter.key === 'status') {
          query.andWhere('admin_user.`status`', '=', filter.value);
          currentFilters.push({
            key: 'status',
            operation: '=',
            value: filter.value
          });
        }
      })

      const sortBy = filters.find((f) => f.key === 'sortBy');
      const sortOrder = filters.find((f) => f.key === 'sortOrder' && ['ASC', 'DESC'].includes(f.value)) || { value: 'ASC' };
      if (sortBy && sortBy.value === 'full_name') {
        query.orderBy('admin_user.`full_name`', sortOrder.value);
        currentFilters.push({
          key: 'sortBy',
          operation: '=',
          value: sortBy.value
        });
      } else {
        query.orderBy('admin_user.`admin_user_id`', "DESC");
      };

      if (sortOrder.key) {
        currentFilters.push({
          key: 'sortOrder',
          operation: '=',
          value: sortOrder.value
        });
      }
      // Clone the main query for getting total right before doing the paging
      const cloneQuery = query.clone();
      cloneQuery.select('COUNT(admin_user.`admin_user_id`)', 'total');
      // Paging
      const page = filters.find((f) => f.key === 'page') || { value: 1 };
      const limit = filters.find((f) => f.key === 'limit') || { value: 20 };// TODO: Get from config
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
      query.limit((page.value - 1) * parseInt(limit.value), parseInt(limit.value));
      return {
        items: (await query.execute(pool)).map(row => camelCase(row)),
        total: (await cloneQuery.load(pool))['total'],
        currentFilters: currentFilters,
      }
    }
  }
}