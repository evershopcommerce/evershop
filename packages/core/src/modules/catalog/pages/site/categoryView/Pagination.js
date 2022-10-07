import PropTypes from 'prop-types';
import React from 'react';
import { Pagination } from '../../../components/product/list/Pagination';

export default function PaginationWrapper({ products: { products: { total, currentFilters } } }) {
  const page = currentFilters.find((filter) => filter.key === 'page');
  console.log(page)
  const limit = currentFilters.find((filter) => filter.key === 'limit');
  return <Pagination total={total} limit={parseInt(limit.value)} currentPage={parseInt(page.value)} />;
}

export const layout = {
  areaId: "content",
  sortOrder: 20
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
