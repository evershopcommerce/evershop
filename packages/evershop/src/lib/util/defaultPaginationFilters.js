import { getCollectionPageSize } from '../../modules/catalog/services/catalogSettings.js';
import { CONSTANTS } from '../helpers.js';

export const defaultPaginationFilters = [
  {
    key: 'od',
    operation: ['eq'],
    callback: (query, operation, value, currentFilters) => {
      if (['ASC', 'DESC', 'asc', 'desc'].includes(value)) {
        query.orderDirection(value.toUpperCase());
        currentFilters.push({
          key: 'od',
          operation,
          value
        });
      }
    }
  },
  {
    key: 'page',
    operation: ['eq'],
    callback: (query, operation, value, currentFilters) => {
      if (parseInt(value, 10) > 0) {
        query.limit(
          (parseInt(value, 10) - 1) * CONSTANTS.ADMIN_COLLECTION_SIZE,
          CONSTANTS.ADMIN_COLLECTION_SIZE
        );
        currentFilters.push({
          key: 'page',
          operation,
          value
        });
      } else {
        query.limit(0, CONSTANTS.ADMIN_COLLECTION_SIZE);
        currentFilters.push({
          key: 'page',
          operation,
          value: 1
        });
      }
    }
  },
  {
    key: 'limit',
    operation: ['eq'],
    callback: (query, operation, value, currentFilters) => {
      const requested = parseInt(value, 10);
      if (requested > 0) {
        // `limit` arrives on a PUBLIC query string — /products, every category
        // page, search. Uncapped, anyone can ask a storefront to render the
        // whole catalog in one response, with the description/inventory/image
        // joins and every per-item price and image resolver behind it. Clamp
        // rather than reject: someone hand-editing the URL gets the largest
        // page we serve, not an error.
        const limit = Math.min(requested, CONSTANTS.MAX_COLLECTION_SIZE);
        const page = currentFilters.find((f) => f.key === 'page');
        query.limit(
          page ? (parseInt(page.value, 10) - 1) * limit : 0,
          limit
        );
        // Report the CLAMPED value, and report it ONCE. The storefront computes
        // its page count as ceil(total / limit), so echoing the requested value
        // back would build links to pages that do not exist.
        currentFilters.push({
          key: 'limit',
          operation,
          value: limit
        });
      } else {
        currentFilters.push({
          key: 'limit',
          operation,
          value: CONSTANTS.ADMIN_COLLECTION_SIZE
        });
      }
    }
  },
  {
    key: '*',
    operation: ['eq'],
    callback: function (query, operation, value, currentFilters) {
      const page = currentFilters.find((f) => f.key === 'page');
      const limit = currentFilters.find((f) => f.key === 'limit');
      const defaultPage = 1;
      const defaultLimit = this.isAdmin
        ? CONSTANTS.ADMIN_COLLECTION_SIZE
        : getCollectionPageSize();
      currentFilters.push({
        key: 'page',
        operation: 'eq',
        value: defaultPage
      });
      if (!limit) {
        currentFilters.push({
          key: 'limit',
          operation: 'eq',
          value: defaultLimit
        });
      }
      // Clamp here too. This is the only entry whose `query.limit()` survives
      // (it runs last, and `limit()` replaces), so it is the real ceiling —
      // and it also guards a store that configures an absurd page size.
      const effectiveLimit = Math.min(
        parseInt(limit?.value || defaultLimit, 10),
        CONSTANTS.MAX_COLLECTION_SIZE
      );
      query.limit(
        (parseInt(page?.value || defaultPage, 10) - 1) * effectiveLimit,
        effectiveLimit
      );
    }
  }
];
