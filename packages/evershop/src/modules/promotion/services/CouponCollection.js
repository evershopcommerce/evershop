const { camelCase } = require('@evershop/evershop/src/lib/util/camelCase');
const { pool } = require('@evershop/evershop/src/lib/postgres/connection');

class CouponCollection {
  constructor(baseQuery) {
    this.baseQuery = baseQuery;
  }

  async init(args, { filters = [] }) {
    const currentFilters = [];

    // Code filter
    const nameFilter = filters.find((f) => f.key === 'coupon');
    if (nameFilter) {
      this.baseQuery.andWhere(
        'coupon.coupon',
        'ILIKE',
        `%${nameFilter.value}%`
      );
      currentFilters.push({
        key: 'coupon',
        operation: '=',
        value: nameFilter.value
      });
    }

    // Status filter
    const statusFilter = filters.find((f) => f.key === 'status');
    if (statusFilter) {
      this.baseQuery.andWhere('coupon.status', '=', statusFilter.value);
      currentFilters.push({
        key: 'status',
        operation: '=',
        value: statusFilter.value
      });
    }

    const startDate = filters.find((f) => f.key === 'startDate');
    if (startDate) {
      const [min, max] = startDate.value.split('-').map((v) => parseFloat(v));
      let currentStartDateFilter;
      if (Number.isNaN(min) === false) {
        this.baseQuery.andWhere('coupon.start_date', '>=', min);
        currentStartDateFilter = { key: 'startDate', value: `${min}` };
      }

      if (Number.isNaN(max) === false) {
        this.baseQuery.andWhere('coupon.start_date', '<=', max);
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
        this.baseQuery.andWhere('coupon.end_date', '>=', min);
        currentEndtDateFilter = { key: 'endDate', value: `${min}` };
      }

      if (Number.isNaN(max) === false) {
        this.baseQuery.andWhere('coupon.end_date', '<=', max);
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
      const [min, max] = usedTime.value.split('-').map((v) => parseFloat(v));
      let currentUsedTimeFilter;
      if (Number.isNaN(min) === false) {
        this.baseQuery.andWhere('coupon.used_time', '>=', min);
        currentUsedTimeFilter = { key: 'usedTime', value: `${min}` };
      }

      if (Number.isNaN(max) === false) {
        this.baseQuery.andWhere('coupon.used_time', '<=', max);
        currentUsedTimeFilter = {
          key: 'usedTime',
          value: `${currentUsedTimeFilter.value}-${max}`
        };
      }
      if (currentUsedTimeFilter) {
        currentFilters.push(currentUsedTimeFilter);
      }
    }

    const sortBy = filters.find((f) => f.key === 'sortBy');
    const sortOrder = filters.find(
      (f) => f.key === 'sortOrder' && ['ASC', 'DESC'].includes(f.value)
    ) || { value: 'ASC' };

    if (sortBy && sortBy.value === 'coupon') {
      this.baseQuery.orderBy('coupon.coupon', sortOrder.value);
      currentFilters.push({
        key: 'sortBy',
        operation: '=',
        value: sortBy.value
      });
    } else {
      this.baseQuery.orderBy('coupon.coupon_id', 'DESC');
    }
    if (sortOrder.key) {
      currentFilters.push({
        key: 'sortOrder',
        operation: '=',
        value: sortOrder.value
      });
    }

    // Clone the main query for getting total right before doing the paging
    const totalQuery = this.baseQuery.clone();
    totalQuery.select('COUNT(coupon.coupon_id)', 'total');
    totalQuery.removeOrderBy();
    // Paging
    const page = filters.find((f) => f.key === 'page') || { value: 1 };
    const limit = filters.find((f) => f.key === 'limit') || { value: 20 }; // TODO: Get from the config
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
    this.baseQuery.limit(
      (page.value - 1) * parseInt(limit.value, 10),
      parseInt(limit.value, 10)
    );
    this.currentFilters = currentFilters;
    this.totalQuery = totalQuery;
  }

  async items() {
    const items = await this.baseQuery.execute(pool);
    return items.map((row) => camelCase(row));
  }

  async total() {
    // Call items to get the total
    const total = await this.totalQuery.execute(pool);
    return total[0].total;
  }

  currentFilters() {
    return this.currentFilters;
  }
}

module.exports.CouponCollection = CouponCollection;
