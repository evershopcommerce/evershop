import PropTypes from 'prop-types';
import React from 'react';
import { Name } from '@components/frontStore/catalog/product/list/item/Name';
import { Thumbnail } from '@components/frontStore/catalog/product/list/item/Thumbnail';
import { Price } from '@components/frontStore/catalog/product/list/item/Price';
import Area from '@components/common/Area';
import { get } from '@evershop/evershop/src/lib/util/get';
import { _ } from '@evershop/evershop/src/lib/locale/translate';

export default function ProductList({ products = [], countPerRow = 3 }) {
  if (products.length === 0) {
    return (
      <div className="product-list">
        <div className="text-center">{_('There is no product to display')}</div>
      </div>
    );
  }

  let className;
  switch (countPerRow) {
    case 3:
      className = 'grid grid-cols-2 md:grid-cols-3 gap-2';
      break;
    case 4:
      className = 'grid grid-cols-2 md:grid-cols-4 gap-2';
      break;
    case 5:
      className = 'grid grid-cols-2 md:grid-cols-5 gap-2';
      break;
    default:
      className = 'grid grid-cols-2 md:grid-cols-3 gap-2';
  }

  return (
    <div className={className}>
      {products.map((p) => (
        <Area
          id="productListingItem"
          className="listing-tem"
          product={p}
          key={p.productId}
          coreComponents={[
            {
              component: { default: Thumbnail },
              props: { url: p.url, imageUrl: get(p, 'image.url'), alt: p.name },
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
      ))}
    </div>
  );
}

ProductList.propTypes = {
  products: PropTypes.arrayOf(
    PropTypes.shape({
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
      })
    })
  ).isRequired,
  countPerRow: PropTypes.number.isRequired
};
