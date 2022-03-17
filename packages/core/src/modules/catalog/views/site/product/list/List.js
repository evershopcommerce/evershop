import PropTypes from 'prop-types';
import React from 'react';
import Area from '../../../../../../lib/components/Area';
import { Name } from './item/Name';
import { Thumbnail } from './item/Thumbnail';
import { Price } from './item/Price';
import { get } from '../../../../../../lib/util/get';
import { getComponents } from '../../../../../../lib/components/getComponents';

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
            key={p.product_id}
            components={getComponents()}
            coreComponents={[
              {
                component: { default: Thumbnail },
                props: { imageUrl: get(p, 'image.url'), alt: p.name },
                sort_order: 10,
                id: 'thumbnail'
              },
              {
                component: { default: Name },
                props: { name: p.name, url: p.url, id: p.product_id },
                sort_order: 20,
                id: 'name'
              },
              {
                component: { default: Price },
                props: { price: p.price, salePrice: p.price },
                sort_order: 30,
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
    product_id: PropTypes.number,
    url: PropTypes.string,
    price: PropTypes.number,
    image: PropTypes.shape({
      url: PropTypes.string
    })
  })).isRequired
};
