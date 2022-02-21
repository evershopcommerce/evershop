import PropTypes from 'prop-types';
import React from 'react';
import ProductList from '../product/list/List';

export default function FeaturedProducts({ products }) {
  return (
    <div className="pt-3">
      <div className="page-width">
        <h3 className="mt-3 mb-3 text-center uppercase h5 tracking-widest">Featured collection</h3>
        {products.map((product) => <div key={product.product_id}>{product.name}</div>)}
      </div>
    </div>
  );
}

FeaturedProducts.propTypes = {
  products: PropTypes.arrayOf(PropTypes.shape({
    product_id: PropTypes.number,
    name: PropTypes.string
  }))
};

FeaturedProducts.defaultProps = {
  products: []
};
