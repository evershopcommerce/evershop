import { ProductList } from '@components/frontStore/ProductList.js';
import React from 'react';
import { _ } from '../../../../../lib/locale/translate/_.js';

interface ProductsProps {
  products: {
    items: Array<React.ComponentProps<typeof ProductList>['products'][0]>;
  };
}
export default function Products({ products: { items } }: ProductsProps) {
  return (
    <div>
      <ProductList products={items} gridColumns={3} />
      <span className="product-count italic block mt-5">
        {_('${count} products', { count: items.length.toString() })}
      </span>
    </div>
  );
}

export const layout = {
  areaId: 'oneColumn',
  sortOrder: 25
};

export const query = `
  query Query($filtersFromUrl: [FilterInput]) {
    products(filters: $filtersFromUrl) {
      items {
        ...Product
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

export const variables = `{
  filtersFromUrl: getContextValue("filtersFromUrl")
}`;
