import React from 'react';
import { _ } from '../../../../../lib/locale/translate/_.js';
import ProductList, { Product } from '../../../components/product/list/List.js';

interface ProductsProps {
  products: {
    items: Array<Product>;
  };
}
export default function Products({ products: { items } }: ProductsProps) {
  return (
    <div>
      <ProductList products={items} countPerRow={4} />
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
    image {
      alt
      url: listing
    }
    url
  }
`;

export const variables = `{
  filtersFromUrl: getContextValue("filtersFromUrl")
}`;
