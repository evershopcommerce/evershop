const { camelCase } = require('@evershop/evershop/src/lib/util/camelCase');
const { pool } = require('@evershop/evershop/src/lib/postgres/connection');

class CustomerCollection {
  constructor(baseQuery) {
    this.baseQuery = baseQuery;
  }

  async init(args, { filters = [] }) {
    const currentFilters = [];

    // Name filter
    const nameFilter = filters.find((f) => f.key === 'full_name');
    if (nameFilter) {
      this.baseQuery.andWhere(
        'customer.full_name',
        'ILIKE',
        `%${nameFilter.value}%`
      );
      currentFilters.push({
        key: 'full_name',
        operation: '=',
        value: nameFilter.value
      });
    }

    // Email filter
    const emailFilter = filters.find((f) => f.key === 'email');
    if (emailFilter) {
      this.baseQuery.andWhere(
        'customer.email',
        'ILIKE',
        `%${emailFilter.value}%`
      );
      currentFilters.push({
        key: 'email',
        operation: '=',
        value: emailFilter.value
      });
    }

    // Keyword search
    const keywordFilter = filters.find((f) => f.key === 'keyword');
    if (keywordFilter) {
      this.baseQuery
        .andWhere('customer.full_name', 'ILIKE', `%${keywordFilter.value}%`)
        .or('customer.email', 'ILIKE', `%${keywordFilter.value}%`);
      currentFilters.push({
        key: 'keyword',
        operation: '=',
        value: keywordFilter.value
      });
    }

    // Status filter
    const statusFilter = filters.find((f) => f.key === 'status');
    if (statusFilter) {
      this.baseQuery.andWhere('customer.status', '=', statusFilter.value);
      currentFilters.push({
        key: 'status',
        operation: '=',
        value: statusFilter.value
      });
    }

    const sortBy = filters.find((f) => f.key === 'sortBy');
    const sortOrder = filters.find(
      (f) =>
        f.key === 'sortOrder' &&
        ['ASC', 'DESC', 'asc', 'desc'].includes(f.value)
    ) || { value: 'DESC' };

    if (sortBy && sortBy.value === 'full_name') {
      this.baseQuery.orderBy('customer.full_name', sortOrder.value);
      currentFilters.push({
        key: 'sortBy',
        operation: '=',
        value: sortBy.value
      });
    } else if (sortBy && sortBy.value === 'email') {
      this.baseQuery.orderBy('customer.email', sortOrder.value);
      currentFilters.push({
        key: 'sortBy',
        operation: '=',
        value: sortBy.value
      });
    } else {
      this.baseQuery.orderBy('customer.customer_id', 'DESC');
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
    totalQuery.select('COUNT(customer.customer_id)', 'total');
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

module.exports.CustomerCollection = CustomerCollection;
