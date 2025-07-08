import { OPERATION_MAP } from '../../../lib/util/filterOperationMap.js';
import { getValueSync } from '../../../lib/util/registry.js';

export default async function registerDefaultOrderCollectionFilters() {
  // List of default supported filters
  const defaultFilters = [
    {
      key: 'keyword',
      operation: ['eq'],
      callback: (query, operation, value, currentFilters) => {
        query
          .andWhere('order.customer_email', 'ILIKE', `%${value}%`)
          .or('order.order_number', 'ILIKE', `%${value}%`)
          .or('order.customer_full_name', 'ILIKE', `%${value}%`);
        currentFilters.push({
          key: 'keyword',
          operation,
          value
        });
      }
    },
    {
      key: 'number',
      operation: ['eq', 'like'],
      callback: (query, operation, value, currentFilters) => {
        if (operation === 'eq') {
          query.andWhere('order.order_number', OPERATION_MAP[operation], value);
        } else {
          query.andWhere(
            'order.order_number',
            OPERATION_MAP[operation],
            `%${value}%`
          );
        }
        currentFilters.push({
          key: 'order_number',
          operation,
          value
        });
      }
    },
    {
      key: 'email',
      operation: ['eq', 'like'],
      callback: (query, operation, value, currentFilters) => {
        if (operation === 'eq') {
          query.andWhere(
            'order.customer_email',
            OPERATION_MAP[operation],
            value
          );
        } else {
          query.andWhere(
            'order.customer_email',
            OPERATION_MAP[operation],
            `%${value}%`
          );
        }
        currentFilters.push({
          key: 'email',
          operation,
          value
        });
      }
    },
    {
      key: 'shipment_status',
      operation: ['eq'],
      callback: (query, operation, value, currentFilters) => {
        query.andWhere(
          'order.shipment_status',
          OPERATION_MAP[operation],
          value
        );
        currentFilters.push({
          key: 'shipment_status',
          operation,
          value
        });
      }
    },
    {
      key: 'payment_status',
      operation: ['eq'],
      callback: (query, operation, value, currentFilters) => {
        query.andWhere('order.payment_status', OPERATION_MAP[operation], value);
        currentFilters.push({
          key: 'payment_status',
          operation,
          value
        });
      }
    },
    {
      key: 'ob',
      operation: ['eq'],
      callback: (query, operation, value, currentFilters) => {
        const orderCollectionSortBy = getValueSync('orderCollectionSortBy', {
          number: (query) => query.orderBy('order.order_number'),
          payment_status: (query) => query.orderBy('order.payment_status'),
          shipment_status: (query) => query.orderBy('order.shipment_status'),
          total: (query) => query.orderBy('order.grand_total'),
          created_at: (query) => query.orderBy('order.created_at')
        });

        if (orderCollectionSortBy[value]) {
          orderCollectionSortBy[value](query, operation);
          currentFilters.push({
            key: 'ob',
            operation,
            value
          });
        }
      }
    }
  ];

  return defaultFilters;
}
