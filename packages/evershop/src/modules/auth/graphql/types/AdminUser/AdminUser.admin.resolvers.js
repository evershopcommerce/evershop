import { select } from '@evershop/postgres-query-builder';
import { camelCase } from '../../../../../lib/util/camelCase.js';

export default {
  Query: {
    adminUser: async (root, { id }, { pool }) => {
      const query = select().from('admin_user');
      query.where('admin_user_id', '=', id);

      const adminUser = await query.load(pool);
      return adminUser ? camelCase(adminUser) : null;
    },
    currentAdminUser: (root, args, { user }) => (user ? camelCase(user) : null),
    adminUsers: async (_, { filters = [] }, { pool }) => {
      const query = select().from('admin_user');
      const currentFilters = [];

      // Attribute filters
      filters.forEach((filter) => {
        if (filter.key === 'full_name') {
          query.andWhere('admin_user.full_name', 'LIKE', `%${filter.value}%`);
          currentFilters.push({
            key: 'full_name',
            operation: 'eq',
            value: filter.value
          });
        }
        if (filter.key === 'status') {
          query.andWhere('admin_user.status', '=', filter.value);
          currentFilters.push({
            key: 'status',
            operation: 'eq',
            value: filter.value
          });
        }
      });

      const sortBy = filters.find((f) => f.key === 'sortBy');
      const sortOrder = filters.find(
        (f) => f.key === 'sortOrder' && ['ASC', 'DESC'].includes(f.value)
      ) || { value: 'ASC' };
      if (sortBy && sortBy.value === 'full_name') {
        query.orderBy('admin_user.full_name', sortOrder.value);
        currentFilters.push({
          key: 'sortBy',
          operation: 'eq',
          value: sortBy.value
        });
      } else {
        query.orderBy('admin_user.admin_user_id', 'DESC');
      }

      if (sortOrder.key) {
        currentFilters.push({
          key: 'sortOrder',
          operation: 'eq',
          value: sortOrder.value
        });
      }
      // Clone the main query for getting total right before doing the paging
      const cloneQuery = query.clone();
      cloneQuery.select('COUNT(admin_user.admin_user_id)', 'total');
      cloneQuery.removeOrderBy();
      // Paging
      const page = filters.find((f) => f.key === 'page') || { value: 1 };
      const limit = filters.find((f) => f.key === 'limit' && f.value > 0) || {
        value: 20
      }; // TODO: Get from the config
      currentFilters.push({
        key: 'page',
        operation: 'eq',
        value: page.value
      });
      currentFilters.push({
        key: 'limit',
        operation: 'eq',
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
  }
};
