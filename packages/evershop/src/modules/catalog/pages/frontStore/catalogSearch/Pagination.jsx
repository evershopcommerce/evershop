import PropTypes from 'prop-types';
import React from 'react';
import { Pagination } from '@components/frontStore/catalog/product/list/Pagination';

export default function PaginationWrapper({
  products: { total, currentFilters }
}) {
  const page = currentFilters.find((filter) => filter.key === 'page');
  const limit = currentFilters.find((filter) => filter.key === 'limit');

  return (
    <Pagination
      total={total}
      limit={parseInt(limit.value, 10)}
      currentPage={parseInt(page.value, 10)}
    />
  );
}

PaginationWrapper.propTypes = {
  products: PropTypes.shape({
    total: PropTypes.number.isRequired,
    currentFilters: PropTypes.arrayOf(
      PropTypes.shape({
        key: PropTypes.string.isRequired,
        operation: PropTypes.string.isRequired,
        value: PropTypes.string.isRequired
      })
    ).isRequired
  }).isRequired
};

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
