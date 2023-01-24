import PropTypes from 'prop-types';
import React from 'react';
import { Pagination } from '../../../components/product/list/Pagination';

export default function PaginationWrapper({ products: { products: { total, currentFilters } } }) {
  const page = currentFilters.find((filter) => filter.key === 'page');
  const limit = currentFilters.find((filter) => filter.key === 'limit');
  return <Pagination total={total} limit={parseInt(limit.value)} currentPage={parseInt(page.value)} />;
}

PaginationWrapper.propTypes = {
  products: PropTypes.shape({
    products: PropTypes.shape({
      total: PropTypes.number.isRequired,
      currentFilters: PropTypes.arrayOf(PropTypes.shape({
        key: PropTypes.string.isRequired,
        operation: PropTypes.string.isRequired,
        value: PropTypes.string.isRequired
      })).isRequired
    }).isRequired
  }).isRequired
};

export const layout = {
  areaId: 'rightColumn',
  sortOrder: 30
};

export const query = `
  query Query {
    products: category(id: getContextValue('categoryId')) {
      products(filters: getContextValue('filtersFromUrl')) {
        total
        currentFilters {
          key
          operation
          value
        }
      }
    }
  }`;
