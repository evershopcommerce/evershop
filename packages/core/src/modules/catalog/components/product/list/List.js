import PropTypes from 'prop-types';
import React from 'react';
import { Name } from './item/Name';
import { Thumbnail } from './item/Thumbnail';
import { Price } from './item/Price';
import Area from '../../../../../lib/components/Area';
import { get } from '../../../../../lib/util/get';

export default function ProductList({ products = [] }) {
  if (products.length === 0) {
    return (
      <div className="product-list">
        <div className="text-center">There is no product to display</div>
      </div>
    );
  }
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {
        products.map((p) => (
          <Area
            id="productListingItem"
            className="listing-tem"
            product={p}
            key={p.productId}
            coreComponents={[
              {
                component: { default: Thumbnail },
                props: { imageUrl: get(p, 'image.url'), alt: p.name },
                sortOrder: 10,
                id: 'thumbnail'
              },
              {
                component: { default: Name },
                props: { name: p.name, url: p.url, id: p.productId },
                sortOrder: 20,
                id: 'name'
              },
              {
                component: { default: Price },
                props: { ...p.price },
                sortOrder: 30,
                id: 'price'
              }
            ]}
          />
        ))
      }
    </div>
  );
}

ProductList.propTypes = {
  products: PropTypes.arrayOf(PropTypes.shape({
    name: PropTypes.string,
    productId: PropTypes.number,
    url: PropTypes.string,
    price: PropTypes.shape({
      regular: PropTypes.shape({
        value: PropTypes.number,
        text: PropTypes.string
      }),
      special: PropTypes.shape({
        value: PropTypes.number,
        text: PropTypes.string
      })
    }),
    image: PropTypes.shape({
      alt: PropTypes.string,
      listing: PropTypes.string
    }),
  })).isRequired
};
