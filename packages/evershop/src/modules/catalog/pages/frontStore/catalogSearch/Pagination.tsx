import React from 'react';
import { Pagination } from '../../../components/product/list/Pagination.js';

interface PaginationWrapperProps {
  products: {
    currentFilters: Array<{
      key: string;
      operation: string;
      value: string;
    }>;
    total: number;
  };
}
export default function PaginationWrapper({
  products: { total, currentFilters }
}: PaginationWrapperProps) {
  const page = currentFilters.find((filter) => filter.key === 'page');
  const limit = currentFilters.find((filter) => filter.key === 'limit');

  return (
    <Pagination
      total={total}
      limit={parseInt(limit?.value || '20', 10)}
      currentPage={parseInt(page?.value || '1', 10)}
    />
  );
}

export const layout = {
  areaId: 'oneColumn',
  sortOrder: 30
};

export const query = `
  query Query($filtersFromUrl: [FilterInput]) {
    products(filters: $filtersFromUrl) {
        total
        currentFilters {
          key
          operation
          value
        }
      }
  }`;

export const variables = `{
  filtersFromUrl: getContextValue("filtersFromUrl")
}`;
