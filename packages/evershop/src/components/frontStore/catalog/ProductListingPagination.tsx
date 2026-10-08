import { useProductListing } from '@components/frontStore/catalog/ProductListingContext.js';
import {
  Pagination,
  DefaultPaginationRenderer
} from '@components/frontStore/Pagination.js';
import React from 'react';

export function ProductListingPagination() {
  const { products } = useProductListing();
  const page = products.currentFilters.find((filter) => filter.key === 'page');
  const limit = products.currentFilters.find(
    (filter) => filter.key === 'limit'
  );
  return (
    <Pagination
      total={products.total}
      limit={limit ? parseInt(limit.value, 10) : 20}
      currentPage={parseInt(page?.value || '1', 10)}
    >
      {(paginationProps) => (
        <DefaultPaginationRenderer renderProps={paginationProps} />
      )}
    </Pagination>
  );
}
