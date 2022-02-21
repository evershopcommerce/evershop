import PropTypes from 'prop-types';
import React from 'react';
import ProductList from '../../product/list/List';
import Pagination from '../../product/list/Pagination';
import { useAppState } from '../../../../../../lib/context/app';
import { get } from '../../../../../../lib/util/get';

export default function Products({ withPagination = true }) {
  const context = useAppState();
  const products = get(context, 'category.products', []);

  return (
    <div className="page-width">
      <span className="product-count italic block mb-2">
        {products.length}
        {' '}
        products
      </span>
      <ProductList products={products} countPerRow={3} />
      {withPagination === true && (
        <Pagination
          currentUrl={get(context, 'currentUrl')}
          currentPage={get(context, 'pagination.currentPage')}
          limit={get(context, 'pagination.limit')}
          total={get(context, 'pagination.total')}
        />
      )}
    </div>
  );
}

Products.propTypes = {
  withPagination: PropTypes.bool.isRequired
};
