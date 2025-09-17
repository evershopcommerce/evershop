import {
  ProductList,
  ProductListProps
} from '@components/frontStore/ProductList.js';
import React from 'react';
import { _ } from '../../../../../lib/locale/translate/_.js';

interface ProductsProps {
  products: {
    showProducts: number;
    products: {
      items: Array<ProductListProps['products'][0]>;
    };
  };
}
export default function Products({
  products: {
    showProducts,
    products: { items }
  }
}: ProductsProps) {
  if (!showProducts) {
    return null;
  }
  return (
    <div>
      <ProductList
        products={items}
        layout="grid"
        gridColumns={3}
        showAddToCart={true}
      />
      <span className="product-count italic block mt-5">
        {_('${count} products', { count: items.length.toString() })}
      </span>
    </div>
  );
}

export const layout = {
  areaId: 'rightColumn',
  sortOrder: 25
};

export const query = `
  query Query {
    products: currentCategory {
      showProducts
      products {
        items {
          ...Product
        }
      }
    }
  }`;

export const fragments = `
  fragment Product on Product {
    productId
    name
    sku
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
    inventory {
      isInStock
    }
    image {
      alt
      url
    }
    url
  }
`;
