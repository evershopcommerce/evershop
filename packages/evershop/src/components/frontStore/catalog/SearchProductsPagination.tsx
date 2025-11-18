import { Area } from '@components/common/index.js';
import { useSearch } from '@components/frontStore/catalog/SearchContext.js';
import {
  Pagination,
  DefaultPaginationRenderer
} from '@components/frontStore/Pagination.js';
import React from 'react';

export function SearchProductsPagination() {
  const { products } = useSearch();
  const page = products.currentFilters.find((filter) => filter.key === 'page');
  const limit = products.currentFilters.find(
    (filter) => filter.key === 'limit'
  );

  return (
    <>
      <Area id="searchProductsPaginationBefore" noOuter />
      <Pagination
        total={products.total}
        limit={limit ? parseInt(limit.value, 10) : 20}
        currentPage={parseInt(page?.value || '1', 10)}
      >
        {(paginationProps) => (
          <DefaultPaginationRenderer renderProps={paginationProps} />
        )}
      </Pagination>
      <Area id="searchProductsPaginationAfter" noOuter />
    </>
  );
}
