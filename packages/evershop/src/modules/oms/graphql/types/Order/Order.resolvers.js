const { select } = require('@evershop/postgres-query-builder');
const { buildUrl } = require('@evershop/evershop/src/lib/router/buildUrl');
const { camelCase } = require('@evershop/evershop/src/lib/util/camelCase');
const { getConfig } = require('@evershop/evershop/src/lib/util/getConfig');

module.exports = {
  Query: {
    order: async (_, { id }, { pool }) => {
      const query = select().from('order');
      query.where('uuid', '=', id);
      const order = await query.load(pool);
      if (!order) {
        return null;
      } else {
        return camelCase(order);
      }
    },
    orders: async (_, { filters = [] }, { pool }) => {
      const query = select().from('order');
      const currentFilters = [];

      // Attribute filters
      filters.forEach((filter) => {
        if (filter.key === 'orderNumber') {
          query.andWhere('order.order_number', 'LIKE', `%${filter.value}%`);
          currentFilters.push({
            key: 'orderNumber',
            operation: '=',
            value: filter.value
          });
        }
        // Order Date filter
        const createdAtFilter = filters.find((f) => f.key === 'createdAt');
        if (createdAtFilter) {
          const [min, max] = createdAtFilter.value
            .split('-')
            .map((v) => parseFloat(v));
          let currentCreatedAtFilter;
          if (Number.isNaN(min) === false) {
            query.andWhere('order.created_at', '>=', min);
            currentCreatedAtFilter = { key: 'createdAt', value: `${min}` };
          }

          if (Number.isNaN(max) === false) {
            query.andWhere('order.created_at', '<=', max);
            currentCreatedAtFilter = {
              key: 'createdAt',
              value: `${currentCreatedAtFilter.value}-${max}`
            };
          }
          if (currentCreatedAtFilter) {
            currentFilters.push(currentCreatedAtFilter);
          }
        }

        // Customer email filter
        if (filter.key === 'customerEmail') {
          query.andWhere('order.customer_email', 'LIKE', `%${filter.value}%`);
          currentFilters.push({
            key: 'customerEmail',
            operation: '=',
            value: filter.value
          });
        }

        // Shipment status filter
        if (filter.key === 'shipmentStatus') {
          query.andWhere('order.shipment_status', '=', filter.value);
          currentFilters.push({
            key: 'shipmentStatus',
            operation: '=',
            value: filter.value
          });
        }

        // Payment status filter
        if (filter.key === 'paymentStatus') {
          query.andWhere('order.payment_status', '=', filter.value);
          currentFilters.push({
            key: 'paymentStatus',
            operation: '=',
            value: filter.value
          });
        }

        // Order Total filter
        const totalFilter = filters.find((f) => f.key === 'total');
        if (totalFilter) {
          const [min, max] = totalFilter.value
            .split('-')
            .map((v) => parseFloat(v));
          let currentTotalFilter;
          if (Number.isNaN(min) === false) {
            query.andWhere('order.grand_total', '>=', min);
            currentTotalFilter = { key: 'total', value: `${min}` };
          }

          if (Number.isNaN(max) === false) {
            query.andWhere('order.grand_total', '<=', max);
            currentTotalFilter = {
              key: 'total',
              value: `${currentTotalFilter.value}-${max}`
            };
          }
          if (currentTotalFilter) {
            currentFilters.push(currentTotalFilter);
          }
        }
      });

      const sortBy = filters.find((f) => f.key === 'sortBy');
      const sortOrder = filters.find(
        (f) => f.key === 'sortOrder' && ['ASC', 'DESC'].includes(f.value)
      ) || { value: 'ASC' };
      if (sortBy && sortBy.value === 'orderNumber') {
        query.orderBy('order.order_number', sortOrder.value);
        currentFilters.push({
          key: 'sortBy',
          operation: '=',
          value: sortBy.value
        });
      } else {
        query.orderBy('order.order_id', 'DESC'); // TODO: Fix 'order' table name should be wrapped in backticks
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
      cloneQuery.select('COUNT("order".order_id)', 'total');
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
    },
    shipmentStatusList: () => getConfig('oms.order.shipmentStatus', {}),
    paymentStatusList: () => getConfig('oms.order.paymentStatus', {})
  },
  Order: {
    items: async ({ orderId }, _, { pool }) => {
      const items = await select()
        .from('order_item')
        .where('order_item_order_id', '=', orderId)
        .execute(pool);
      return items.map((item) => camelCase(item));
    },
    shippingAddress: async ({ shippingAddressId }, _, { pool }) => {
      const address = await select()
        .from('order_address')
        .where('order_address_id', '=', shippingAddressId)
        .load(pool);
      return address ? camelCase(address) : null;
    },
    billingAddress: async ({ billingAddressId }, _, { pool }) => {
      const address = await select()
        .from('order_address')
        .where('order_address_id', '=', billingAddressId)
        .load(pool);
      return address ? camelCase(address) : null;
    },
    activities: async ({ orderId }, _, { pool }) => {
      const query = select().from('order_activity');
      query.where('order_activity_order_id', '=', orderId);
      query.orderBy('order_activity_id', 'DESC');
      const activities = await query.execute(pool);
      return activities
        ? activities.map((activity) => camelCase(activity))
        : null;
    },
    shipment: async ({ orderId, uuid }, _, { pool }) => {
      const shipment = await select()
        .from('shipment')
        .where('shipment_order_id', '=', orderId)
        .load(pool);
      return shipment ? { ...camelCase(shipment), orderUuid: uuid } : null;
    },
    editUrl: ({ uuid }) => buildUrl('orderEdit', { id: uuid }),
    createShipmentApi: ({ uuid }) => buildUrl('createShipment', { id: uuid }),
    customerUrl: async ({ customerId }, _, { pool }) => {
      const customer = await select()
        .from('customer')
        .where('customer_id', '=', customerId)
        .load(pool);
      return customer
        ? buildUrl('customerEdit', { id: customer['uuid'] })
        : null;
    },
    shipmentStatus: ({ shipmentStatus }) => {
      const statusList = getConfig('oms.order.shipmentStatus', {});
      const status = statusList[shipmentStatus] || {
        name: 'Unknown',
        code: shipmentStatus,
        badge: 'default',
        progress: 'incomplete'
      };

      return {
        ...status,
        code: shipmentStatus
      };
    },
    paymentStatus: ({ paymentStatus }) => {
      const statusList = getConfig('oms.order.paymentStatus', {});
      const status = statusList[paymentStatus] || {
        name: 'Unknown',
        code: paymentStatus,
        badge: 'default',
        progress: 'incomplete'
      };

      return {
        ...status,
        code: paymentStatus
      };
    }
  },
  Shipment: {
    updateShipmentApi: ({ orderUuid, uuid }) =>
      buildUrl('updateShipment', { order_id: orderUuid, shipment_id: uuid })
  }
};
