import { OPERATION_MAP } from '../../../lib/util/filterOperationMap.js';
import { getValueSync } from '../../../lib/util/registry.js';

export async function registerDefaultCouponCollectionFilters() {
  // List of default supported filters
  const defaultFilters = [
    {
      key: 'coupon',
      operation: ['eq', 'like'],
      callback: (query, operation, value, currentFilters) => {
        if (operation === 'eq') {
          query.andWhere('coupon.coupon', '=', value);
        } else {
          query.andWhere('coupon.coupon', 'ILIKE', `%${value}%`);
        }
        currentFilters.push({
          key: 'name',
          operation,
          value
        });
      }
    },
    {
      key: 'status',
      operation: ['eq'],
      callback: (query, operation, value, currentFilters) => {
        query.andWhere('coupon.status', OPERATION_MAP[operation], value);
        currentFilters.push({
          key: 'status',
          operation,
          value
        });
      }
    },
    {
      key: 'free_shipping',
      operation: ['eq'],
      callback: (query, operation, value, currentFilters) => {
        query.andWhere('coupon.free_shipping', OPERATION_MAP[operation], value);
        currentFilters.push({
          key: 'free_shipping',
          operation,
          value
        });
      }
    },
    {
      key: 'ob',
      operation: ['eq'],
      callback: (query, operation, value, currentFilters) => {
        const couponCollectionSortBy = getValueSync('couponCollectionSortBy', {
          coupon: (query) => query.orderBy('coupon.coupon'),
          status: (query) => query.orderBy('coupon.status'),
          used_time: (query) => query.orderBy('coupon.used_time')
        });

        if (couponCollectionSortBy[value]) {
          couponCollectionSortBy[value](query, operation);
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
