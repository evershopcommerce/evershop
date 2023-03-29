const { select } = require('@evershop/postgres-query-builder');
const { buildUrl } = require('@evershop/evershop/src/lib/router/buildUrl');
const { camelCase } = require('@evershop/evershop/src/lib/util/camelCase');

module.exports = {
  Query: {
    coupon: async (root, { id }, { pool }) => {
      const query = select().from('coupon');
      query.where('coupon_id', '=', id);
      // if (admin !== true) {
      //   query.where('cms_page.status', '=', 1);
      // }

      const coupon = await query.load(pool);
      return coupon ? camelCase(coupon) : null;
    },
    coupons: async (_, { filters = [] }, { pool }) => {
      const query = select().from('coupon');
      const currentFilters = [];

      // Attribute filters
      filters.forEach((filter) => {
        if (filter.key === 'coupon') {
          query.andWhere('coupon.coupon', 'LIKE', `%${filter.value}%`);
          currentFilters.push({
            key: 'coupon',
            operation: '=',
            value: filter.value
          });
        }
        if (filter.key === 'status') {
          query.andWhere('coupon.status', '=', filter.value);
          currentFilters.push({
            key: 'status',
            operation: '=',
            value: filter.value
          });
        }
        // Start date filter
        const startDate = filters.find((f) => f.key === 'startDate');
        if (startDate) {
          const [min, max] = startDate.value
            .split('-')
            .map((v) => parseFloat(v));
          let currentStartDateFilter;
          if (Number.isNaN(min) === false) {
            query.andWhere('coupon.start_date', '>=', min);
            currentStartDateFilter = { key: 'startDate', value: `${min}` };
          }

          if (Number.isNaN(max) === false) {
            query.andWhere('coupon.start_date', '<=', max);
            currentStartDateFilter = {
              key: 'startDate',
              value: `${currentStartDateFilter.value}-${max}`
            };
          }
          if (currentStartDateFilter) {
            currentFilters.push(currentStartDateFilter);
          }
        }
        // Start date filter
        const endDate = filters.find((f) => f.key === 'endDate');
        if (endDate) {
          const [min, max] = endDate.value.split('-').map((v) => parseFloat(v));
          let currentEndtDateFilter;
          if (Number.isNaN(min) === false) {
            query.andWhere('coupon.end_date', '>=', min);
            currentEndtDateFilter = { key: 'endDate', value: `${min}` };
          }

          if (Number.isNaN(max) === false) {
            query.andWhere('coupon.end_date', '<=', max);
            currentEndtDateFilter = {
              key: 'endDate',
              value: `${currentEndtDateFilter.value}-${max}`
            };
          }
          if (currentEndtDateFilter) {
            currentFilters.push(currentEndtDateFilter);
          }
        }

        // Used time filter
        const usedTime = filters.find((f) => f.key === 'usedTime');
        if (usedTime) {
          const [min, max] = usedTime.value
            .split('-')
            .map((v) => parseFloat(v));
          let currentUsedTimeFilter;
          if (Number.isNaN(min) === false) {
            query.andWhere('coupon.used_time', '>=', min);
            currentUsedTimeFilter = { key: 'usedTime', value: `${min}` };
          }

          if (Number.isNaN(max) === false) {
            query.andWhere('coupon.used_time', '<=', max);
            currentUsedTimeFilter = {
              key: 'usedTime',
              value: `${currentUsedTimeFilter.value}-${max}`
            };
          }
          if (currentUsedTimeFilter) {
            currentFilters.push(currentUsedTimeFilter);
          }
        }
      });

      const sortBy = filters.find((f) => f.key === 'sortBy');
      const sortOrder = filters.find(
        (f) => f.key === 'sortOrder' && ['ASC', 'DESC'].includes(f.value)
      ) || { value: 'ASC' };
      if (sortBy && sortBy.value === 'coupon') {
        query.orderBy('coupon.coupon', sortOrder.value);
        currentFilters.push({
          key: 'sortBy',
          operation: '=',
          value: sortBy.value
        });
      } else {
        query.orderBy('coupon.coupon_id', 'DESC');
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
      cloneQuery.select('COUNT(coupon.coupon_id)', 'total');
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
  Coupon: {
    targetProducts: ({ targetProducts }) => {
      if (!targetProducts) {
        return null;
      } else {
        try {
          const result = JSON.parse(targetProducts);
          return camelCase(result);
        } catch (e) {
          throw new Error('Invalid JSON in coupon targetProducts');
        }
      }
    },
    condition: ({ condition }) => {
      if (!condition) {
        return null;
      } else {
        try {
          const result = JSON.parse(condition);
          return camelCase(result);
        } catch (e) {
          throw new Error('Invalid JSON in coupon condition');
        }
      }
    },
    userCondition: ({ userCondition }) => {
      if (!userCondition) {
        return null;
      } else {
        try {
          const result = JSON.parse(userCondition);
          return camelCase(result);
        } catch (e) {
          throw new Error('Invalid JSON in coupon userCondition');
        }
      }
    },
    buyxGety: ({ buyxGety }) => {
      if (!buyxGety) {
        return [];
      } else {
        try {
          const results = JSON.parse(buyxGety);
          return results.map((result) => camelCase(result));
        } catch (e) {
          throw new Error('Invalid JSON in coupon buyxGety');
        }
      }
    },
    editUrl: ({ uuid }) => buildUrl('couponEdit', { id: uuid }),
    updateApi: (coupon) => buildUrl('updateCoupon', { id: coupon.uuid }),
    deleteApi: (coupon) => buildUrl('deleteCoupon', { id: coupon.uuid })
  },
  Cart: {
    applyCouponApi: (cart) => buildUrl('couponApply', { cart_id: cart.uuid })
  }
};
