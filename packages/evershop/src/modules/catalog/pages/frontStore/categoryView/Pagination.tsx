import {
  Pagination,
  DefaultPaginationRenderer
} from '@components/frontStore/Pagination.js';
import React from 'react';

interface PaginationWrapperProps {
  products: {
    showProducts: number;
    products: {
      total: number;
      currentFilters: Array<{
        key: string;
        operation: string;
        value: string;
      }>;
    };
  };
}
export default function PaginationWrapper({
  products: {
    showProducts,
    products: { total, currentFilters }
  }
}: PaginationWrapperProps) {
  if (!showProducts) {
    return null;
  }
  const page = currentFilters.find((filter) => filter.key === 'page');
  const limit = currentFilters.find((filter) => filter.key === 'limit');
  return (
    <Pagination
      total={total}
      limit={limit ? parseInt(limit.value, 10) : 20}
      currentPage={parseInt(page?.value || '1', 10)}
    >
      {(paginationProps) => (
        <DefaultPaginationRenderer renderProps={paginationProps} />
      )}
    </Pagination>
  );
}

export const layout = {
  areaId: 'rightColumn',
  sortOrder: 30
};

export const query = `
  query Query {
    products: currentCategory {
      showProducts
      products {
        total
        currentFilters {
          key
          operation
          value
        }
      }
    }
  }`;
