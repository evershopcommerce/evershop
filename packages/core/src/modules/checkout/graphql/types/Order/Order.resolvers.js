const { select } = require("@evershop/mysql-query-builder");
const { buildUrl } = require("../../../../../lib/router/buildUrl");
const { camelCase } = require("../../../../../lib/util/camelCase");
const { getConfig } = require("../../../../../lib/util/getConfig");

module.exports = {
  Query: {
    order: async (_, { id }, { pool, tokenPayload }) => {
      const { customerId, sid } = tokenPayload;
      const query = select()
        .from('order');
      query.where('order_id', '=', id)
      query.andWhere('customer_id', '=', customerId)
        .or('sid', '=', sid);
      const order = await query.load(pool);
      if (!order) {
        return null;
      } else {
        return camelCase(order)
      }
    },
    orders: async (_, { filters = [] }, { pool }) => {
      const query = select().from('order');
      const currentFilters = [];

      // Attribute filters
      filters.forEach((filter) => {
        if (filter.key === 'orderNumber') {
          query.andWhere('order.`order_number`', 'LIKE', `%${filter.value}%`);
          currentFilters.push({
            key: 'orderNumber',
            operation: '=',
            value: filter.value
          });
        }
        // Order Date filter 
        const createdAtFilter = filters.find((f) => f.key === 'createdAt');
        if (createdAtFilter) {
          const [min, max] = createdAtFilter.value.split('-').map((v) => parseFloat(v));
          let currentCreatedAtFilter;
          if (isNaN(min) === false) {
            query.andWhere('order.`created_at`', '>=', min);
            currentCreatedAtFilter = { key: 'createdAt', value: `${min}` };
          }

          if (isNaN(max) === false) {
            query.andWhere('order.`created_at`', '<=', max);
            currentCreatedAtFilter = { key: 'createdAt', value: `${currentCreatedAtFilter.value}-${max}` };
          }
          if (currentCreatedAtFilter) {
            currentFilters.push(currentCreatedAtFilter);
          }
        }

        // Customer email filter 
        if (filter.key === 'customerEmail') {
          query.andWhere('order.`customer_email`', 'LIKE', `%${filter.value}%`);
          currentFilters.push({
            key: 'customerEmail',
            operation: '=',
            value: filter.value
          });
        }

        // Shipment status filter 
        if (filter.key === 'shipmentStatus') {
          query.andWhere('order.`shipment_status`', '=', filter.value);
          currentFilters.push({
            key: 'shipmentStatus',
            operation: '=',
            value: filter.value
          });
        }

        // Payment status filter 
        if (filter.key === 'paymentStatus') {
          query.andWhere('order.`payment_status`', '=', filter.value);
          currentFilters.push({
            key: 'paymentStatus',
            operation: '=',
            value: filter.value
          });
        }

        // Order Total filter 
        const totalFilter = filters.find((f) => f.key === 'total');
        if (totalFilter) {
          const [min, max] = totalFilter.value.split('-').map((v) => parseFloat(v));
          let currentTotalFilter;
          if (isNaN(min) === false) {
            query.andWhere('order.`grand_total`', '>=', min);
            currentTotalFilter = { key: 'total', value: `${min}` };
          }

          if (isNaN(max) === false) {
            query.andWhere('order.`grand_total`', '<=', max);
            currentTotalFilter = { key: 'total', value: `${currentTotalFilter.value}-${max}` };
          }
          if (currentTotalFilter) {
            currentFilters.push(currentTotalFilter);
          }
        }
      })

      const sortBy = filters.find((f) => f.key === 'sortBy');
      const sortOrder = filters.find((f) => f.key === 'sortOrder' && ['ASC', 'DESC'].includes(f.value)) || { value: 'ASC' };
      if (sortBy && sortBy.value === 'orderNumber') {
        query.orderBy('`order`.`order_number`', sortOrder.value);
        currentFilters.push({
          key: 'sortBy',
          operation: '=',
          value: sortBy.value
        });
      } else {
        query.orderBy('`order`.`order_id`', "DESC");// TODO: Fix 'order' table name should be wrapped in backticks
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
      cloneQuery.select('COUNT(`order`.`order_id`)', 'total');
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
    },
    shipmentStatusList: () => getConfig('order.shipmentStatus', []),
    paymentStatusList: () => getConfig('order.paymentStatus', []),
  },
  Order: {
    items: async ({ orderId }, { }, { pool, user }) => {
      const items = await select().from('order_item').where('order_item_order_id', '=', orderId).execute(pool);
      return items.map((item) => camelCase(item));
    },
    shippingAddress: async ({ shippingAddressId }, { }, { pool, user }) => {
      const address = await select().from('order_address').where('order_address_id', '=', shippingAddressId).load(pool);
      return address ? camelCase(address) : null;
    },
    billingAddress: async ({ billingAddressId }, { }, { pool, user }) => {
      const address = await select().from('order_address').where('order_address_id', '=', billingAddressId).load(pool);
      return address ? camelCase(address) : null;
    },
    activities: async ({ orderId }, { }, { pool }) => {
      const activities = await select().from('order_activity').where('order_activity_order_id', '=', orderId).execute(pool);
      return activities ? activities.map((activity) => camelCase(activity)) : null;
    },
    shipment: async ({ orderId }, { }, { pool }) => {
      const shipment = await select().from('shipment').where('shipment_order_id', '=', orderId).load(pool);
      return shipment ? camelCase(shipment) : null;
    },
    editUrl: ({ orderId }) => buildUrl('orderEdit', { id: orderId }),
  }
}
