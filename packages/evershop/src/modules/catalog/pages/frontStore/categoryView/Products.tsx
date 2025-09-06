import React from 'react';
import { Product } from 'src/modules/catalog/components/product/list/List.js';
import { _ } from '../../../../../lib/locale/translate/_.js';
import ProductList from '../../../components/product/list/List.js';

interface ProductsProps {
  products: {
    showProducts: number;
    products: {
      items: Array<Product>;
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
      <ProductList products={items} countPerRow={3} />
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
  query Query($filters: [FilterInput]) {
    products: category(id: getContextValue('categoryId')) {
      showProducts
      products(filters: $filters) {
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
    image {
      alt
      url: listing
    }
    url
  }
`;

export const variables = `
{
  filters: getContextValue('filtersFromUrl')
}`;
