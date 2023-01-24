import React from 'react';
import ProductList from '../../../components/product/list/List';

export default function Products({ products: { products: { items } } }) {
  return (
    <div>
      <ProductList products={items} countPerRow={3} />
      <span className="product-count italic block mt-2">
        {`${items.length} products`}
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
    products: category(id: getContextValue('categoryId')) {
      products(filters: getContextValue('filtersFromUrl')) {
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
