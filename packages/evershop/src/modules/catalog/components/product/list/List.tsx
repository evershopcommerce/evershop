import Area from '@components/common/Area.js';
import React from 'react';
import { _ } from '../../../../../lib/locale/translate/_.js';
import { get } from '../../../../../lib/util/get.js';
import { Name } from './item/Name.js';
import { Price } from './item/Price.js';
import { Thumbnail } from './item/Thumbnail.js';

export interface Product {
  name: string;
  sku: string;
  productId: number;
  url: string;
  price: {
    regular: {
      value: number;
      text: string;
    };
    special: {
      value: number;
      text: string;
    };
  };
  image: {
    alt: string;
    listing: string;
  };
}
export interface ProductListProps {
  products: Array<Product>;
  countPerRow: number;
}
export default function ProductList({
  products = [],
  countPerRow = 3
}: ProductListProps) {
  {
    if (products.length === 0) {
      return (
        <div className="product-list">
          <div className="text-center">
            {_('There is no product to display')}
          </div>
        </div>
      );
    }

    let className;
    switch (countPerRow) {
      case 3:
        className = 'grid grid-cols-2 md:grid-cols-3 gap-5';
        break;
      case 4:
        className = 'grid grid-cols-2 md:grid-cols-4 gap-5';
        break;
      case 5:
        className = 'grid grid-cols-2 md:grid-cols-5 gap-5';
        break;
      default:
        className = 'grid grid-cols-2 md:grid-cols-3 gap-5';
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
                props: {
                  url: p.url,
                  imageUrl: get(p, 'image.url'),
                  alt: p.name
                },
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
}
