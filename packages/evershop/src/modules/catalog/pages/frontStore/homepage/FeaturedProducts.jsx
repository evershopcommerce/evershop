import ProductList from '@components/frontStore/catalog/product/list/List';
import { _ } from '@evershop/evershop/src/lib/locale/translate';
import PropTypes from 'prop-types';
import React from 'react';

export default function FeaturedProducts({ featuredProducts }) {
  return (
    <div className="pt-3">
      <div className="page-width">
        <h3 className="mt-3 mb-3 text-center uppercase h5 tracking-widest">
          {_('Featured collection')}
        </h3>
        <ProductList products={featuredProducts} countPerRow={4} />
      </div>
    </div>
  );
}

FeaturedProducts.propTypes = {
  featuredProducts: PropTypes.arrayOf(
    PropTypes.shape({
      name: PropTypes.string,
      productId: PropTypes.number,
      url: PropTypes.string,
      price: PropTypes.shape({
        regular: PropTypes.shape({
          value: PropTypes.float,
          text: PropTypes.string
        }),
        special: PropTypes.shape({
          value: PropTypes.float,
          text: PropTypes.string
        })
      }),
      image: PropTypes.shape({
        alt: PropTypes.string,
        listing: PropTypes.string
      })
    })
  )
};

FeaturedProducts.defaultProps = {
  featuredProducts: []
};

export const layout = {
  areaId: 'content',
  sortOrder: 15
};

export const query = `
  query query {
    featuredProducts (limit: 3) {
      productId
      name
      price {
        regular {
          value
          text
        }
        special {
          value
          text
        }
      }
      image {
        alt
        url: listing
      }
      url
    }
  }
`;
