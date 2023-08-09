const { camelCase } = require('@evershop/evershop/src/lib/util/camelCase');
const { pool } = require('@evershop/evershop/src/lib/postgres/connection');

class ReviewCollection {
  constructor(baseQuery) {
    this.baseQuery = baseQuery;
  }

  async init(args, { filters = [] }, { user }) {
    if (!user) {
      this.baseQuery.andWhere('product_review.approved', '=', 't');
    }
    const currentFilters = [];

    // Product Name filter
    const productNameFilter = filters.find((f) => f.key === 'product');
    if (productNameFilter) {
      this.baseQuery.andWhere(
        'product_description.name',
        'ILIKE',
        `%${productNameFilter.value}%`
      );
      currentFilters.push({
        key: 'product',
        operation: '=',
        value: productNameFilter.value
      });
    }

    // Customer Name filter
    const customerNameFilter = filters.find((f) => f.key === 'customer_name');
    if (customerNameFilter) {
      this.baseQuery.andWhere(
        'product_review.customer_name',
        'ILIKE',
        `%${customerNameFilter.value}%`
      );
      currentFilters.push({
        key: 'customer_name',
        operation: '=',
        value: customerNameFilter.value
      });
    }

    // Status filter
    const statusFilter = filters.find((f) => f.key === 'approved');
    if (statusFilter) {
      this.baseQuery.andWhere(
        'product_review.approved',
        '=',
        statusFilter.value
      );
      currentFilters.push({
        key: 'approved',
        operation: '=',
        value: statusFilter.value
      });
    }

    const sortBy = filters.find((f) => f.key === 'sortBy');
    const sortOrder = filters.find(
      (f) => f.key === 'sortOrder' && ['ASC', 'DESC'].includes(f.value)
    ) || { value: 'ASC' };

    if (sortBy && sortBy.value === 'rating') {
      this.baseQuery.orderBy('product_review.rating', sortOrder.value);
      currentFilters.push({
        key: 'sortBy',
        operation: '=',
        value: sortBy.value
      });
    } else {
      this.baseQuery.orderBy('product_review.review_id', 'DESC');
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
    totalQuery.select('COUNT(product_review.review_id)', 'total');
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

module.exports.ReviewCollection = ReviewCollection;
