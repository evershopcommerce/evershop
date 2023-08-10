const { camelCase } = require('@evershop/evershop/src/lib/util/camelCase');
const { pool } = require('@evershop/evershop/src/lib/postgres/connection');

class OrderCollection {
  constructor(baseQuery) {
    this.baseQuery = baseQuery;
  }

  async init(args, { filters = [] }) {
    const currentFilters = [];

    // Number filter
    const numberFilter = filters.find((f) => f.key === 'orderNumber');
    if (numberFilter) {
      this.baseQuery.andWhere(
        'order.order_number',
        'ILIKE',
        `%${numberFilter.value}%`
      );
      currentFilters.push({
        key: 'orderNumber',
        operation: '=',
        value: numberFilter.value
      });
    }

    // Email filter
    const customerEmailFilter = filters.find((f) => f.key === 'customerEmail');
    if (customerEmailFilter) {
      this.baseQuery.andWhere(
        'order.customer_email',
        'ILIKE',
        `%${customerEmailFilter.value}%`
      );
      currentFilters.push({
        key: 'customerEmail',
        operation: '=',
        value: customerEmailFilter.value
      });
    }

    // Keyword search
    const keywordFilter = filters.find((f) => f.key === 'keyword');
    if (keywordFilter) {
      this.baseQuery
        .andWhere('order.customer_email', 'ILIKE', `%${keywordFilter.value}%`)
        .or('order.order_number', 'ILIKE', `%${keywordFilter.value}%`)
        .or('order.customer_full_name', 'ILIKE', `%${keywordFilter.value}%`);
      currentFilters.push({
        key: 'keyword',
        operation: '=',
        value: keywordFilter.value
      });
    }

    // Status filter
    const shipmentStatusFilter = filters.find(
      (f) => f.key === 'shipmentStatus'
    );
    if (shipmentStatusFilter) {
      this.baseQuery.andWhere(
        'order.shipment_status',
        '=',
        shipmentStatusFilter.value
      );
      currentFilters.push({
        key: 'shipmentStatus',
        operation: '=',
        value: shipmentStatusFilter.value
      });
    }

    // Status filter
    const paymentStatusFilter = filters.find((f) => f.key === 'paymentStatus');
    if (paymentStatusFilter) {
      this.baseQuery.andWhere(
        'order.payment_status',
        '=',
        paymentStatusFilter.value
      );
      currentFilters.push({
        key: 'paymentStatus',
        operation: '=',
        value: paymentStatusFilter.value
      });
    }

    // Order Total filter
    const totalFilter = filters.find((f) => f.key === 'total');
    if (totalFilter) {
      const [min, max] = totalFilter.value.split('-').map((v) => parseFloat(v));
      let currentTotalFilter;
      if (Number.isNaN(min) === false) {
        this.baseQuery.andWhere('order.grand_total', '>=', min);
        currentTotalFilter = { key: 'total', value: `${min}` };
      }

      if (Number.isNaN(max) === false) {
        this.baseQuery.andWhere('order.grand_total', '<=', max);
        currentTotalFilter = {
          key: 'total',
          value: `${currentTotalFilter.value}-${max}`
        };
      }
      if (currentTotalFilter) {
        currentFilters.push(currentTotalFilter);
      }
    }

    const sortBy = filters.find((f) => f.key === 'sortBy');
    const sortOrder = filters.find(
      (f) => f.key === 'sortOrder' && ['ASC', 'DESC'].includes(f.value)
    ) || { value: 'ASC' };

    if (sortBy && sortBy.value === 'orderNumber') {
      this.baseQuery.orderBy('order.order_number', sortOrder.value);
      currentFilters.push({
        key: 'sortBy',
        operation: '=',
        value: sortBy.value
      });
    } else {
      this.baseQuery.orderBy('order.order_id', 'DESC');
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
    totalQuery.select('COUNT("order".order_id)', 'total');
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

module.exports.OrderCollection = OrderCollection;
